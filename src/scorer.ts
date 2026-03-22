import { PullRequestFile, CommitInfo } from './detector';
import { isIgnoredPath } from './config';

export interface ScoreBreakdown {
  testCoverageDelta: number;
  commitMessageQuality: number;
  codeDuplication: number;
  fileScatter: number;
  documentation: number;
  boilerplateRatio: number;
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: Record<string, string>;
}

const TEST_FILE_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx|py|rb|go|java|cs|php|rs)$/i,
  /(^|\/)(tests?|__tests?__|spec|specs)\//i,
];
const DOC_FILE_PATTERNS = [/readme/i, /changelog/i, /\.md$/i, /docs?\//i];
const CODE_FILE_PATTERNS = [/\.(ts|tsx|js|jsx|py|rb|go|java|cs|php|rs|c|cpp|h|hpp|swift|kt)$/i];

function isTestFile(filename: string): boolean {
  return TEST_FILE_PATTERNS.some(p => p.test(filename));
}
function isDocFile(filename: string): boolean {
  return DOC_FILE_PATTERNS.some(p => p.test(filename));
}
function isCodeFile(filename: string): boolean {
  return CODE_FILE_PATTERNS.some(p => p.test(filename)) && !isTestFile(filename);
}

const GOOD_COMMIT_PATTERNS = [
  /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?!?:\s.{10,}/i,
  /^.{20,}$/,
];
const BAD_COMMIT_PATTERNS = [
  /^(update|fix|add|change|modify|improve|refactor|wip|temp|test|draft)\s*$/i,
  /^(update|fix|add|change)s?\s+(file|code|thing|stuff)s?$/i,
  /^[a-z]{1,8}$/i,
  /^\.$|^\.\.$/,
];

function scoreCommitMessage(message: string): number {
  const firstLine = message.trim().split('\n')[0];
  if (BAD_COMMIT_PATTERNS.some(p => p.test(firstLine))) return 0;
  if (GOOD_COMMIT_PATTERNS.some(p => p.test(firstLine))) return 100;
  if (firstLine.length >= 15) return 60;
  return 30;
}

function computeDuplicationScore(files: PullRequestFile[]): { score: number; detail: string } {
  let totalAdded = 0;
  let duplicateLines = 0;
  for (const file of files) {
    if (!file.patch) continue;
    const addedLines = file.patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    const seen = new Map<string, number>();
    for (const line of addedLines) {
      const trimmed = line.slice(1).trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
      seen.set(trimmed, (seen.get(trimmed) || 0) + 1);
    }
    totalAdded += addedLines.length;
    for (const count of seen.values()) {
      if (count > 1) duplicateLines += count - 1;
    }
  }
  if (totalAdded === 0) return { score: 100, detail: 'No added code lines to analyze' };
  const ratio = duplicateLines / totalAdded;
  const score = Math.max(0, Math.round(100 - ratio * 200));
  return { score, detail: Math.round(ratio * 100) + '% duplicate/repetitive lines' };
}

export function scorepr(
  files: PullRequestFile[],
  commits: CommitInfo[],
  ignorePaths: string[]
): ScoreBreakdown {
  const filteredFiles = files.filter(f => !isIgnoredPath(f.filename, ignorePaths));
  const details: Record<string, string> = {};

  const codeFiles = filteredFiles.filter(f => isCodeFile(f.filename));
  const testFiles = filteredFiles.filter(f => isTestFile(f.filename));
  let testCoverageDelta: number;
  if (codeFiles.length === 0) {
    testCoverageDelta = 100;
    details.testCoverage = 'No code files changed — full marks';
  } else if (testFiles.length === 0) {
    testCoverageDelta = 0;
    details.testCoverage = codeFiles.length + ' code file(s) changed but no test files';
  } else {
    const codeAdditions = codeFiles.reduce((s, f) => s + f.additions, 0);
    const testAdditions = testFiles.reduce((s, f) => s + f.additions, 0);
    const ratio = Math.min(1, testAdditions / Math.max(1, codeAdditions));
    testCoverageDelta = Math.round(ratio * 100);
    details.testCoverage = testAdditions + ' test lines / ' + codeAdditions + ' code lines';
  }

  const commitScores = commits.map(c => scoreCommitMessage(c.message));
  const commitMessageQuality = commitScores.length > 0
    ? Math.round(commitScores.reduce((s, v) => s + v, 0) / commitScores.length)
    : 50;
  details.commitMessages = commits.length + ' commit(s), avg score ' + commitMessageQuality;

  const { score: codeDuplication, detail: dupDetail } = computeDuplicationScore(filteredFiles);
  details.duplication = dupDetail;

  const uniqueDirs = new Set(filteredFiles.map(f => f.filename.split('/').slice(0, -1).join('/') || '.'));
  let fileScatter: number;
  if (filteredFiles.length <= 5) {
    fileScatter = 100;
    details.scatter = filteredFiles.length + ' file(s) changed';
  } else if (uniqueDirs.size > 10 && filteredFiles.length > 20) {
    fileScatter = 20;
    details.scatter = filteredFiles.length + ' files across ' + uniqueDirs.size + ' directories';
  } else {
    const scatterRatio = uniqueDirs.size / filteredFiles.length;
    fileScatter = Math.round(Math.max(20, 100 - scatterRatio * 80));
    details.scatter = filteredFiles.length + ' files in ' + uniqueDirs.size + ' directories';
  }

  let documentation: number;
  const hasDocChanges = filteredFiles.some(f => isDocFile(f.filename));
  const hasSignificantCodeChange = filteredFiles.filter(f => isCodeFile(f.filename)).reduce((s, f) => s + f.additions, 0) > 50;
  if (!hasSignificantCodeChange) {
    documentation = 100;
    details.documentation = 'No significant code changes — doc update not required';
  } else if (hasDocChanges) {
    documentation = 100;
    details.documentation = 'Documentation updated';
  } else {
    documentation = 20;
    details.documentation = 'Significant code added but no documentation updated';
  }

  let totalPatched = 0;
  let boilerplateCount = 0;
  const BPPATTERNS = [/TODO[:;]/gi, /\bplaceholder\b/gi, /throw new Error\(['"]Not implemented['"]\)/gi, /raise NotImplementedError/gi];
  for (const file of filteredFiles) {
    if (!file.patch) continue;
    const lines = file.patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    totalPatched += lines.length;
    for (const line of lines) {
      for (const p of BPPATTERNS) { p.lastIndex = 0; if (p.test(line)) { boilerplateCount += 1; break; } }
    }
  }
  const boilerplateRatio = totalPatched === 0 ? 100 : Math.max(0, Math.round(100 - (boilerplateCount / totalPatched) * 500));
  details.boilerplate = totalPatched === 0 ? 'No patched lines to analyze' : boilerplateCount + ' boilerplate line(s) of ' + totalPatched;

  const total = Math.round(
    testCoverageDelta * 0.25 +
    commitMessageQuality * 0.20 +
    codeDuplication * 0.20 +
    fileScatter * 0.15 +
    documentation * 0.10 +
    boilerplateRatio * 0.10
  );

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (total >= 85) grade = 'A';
  else if (total >= 70) grade = 'B';
  else if (total >= 55) grade = 'C';
  else if (total >= 40) grade = 'D';
  else grade = 'F';

  return { testCoverageDelta, commitMessageQuality, codeDuplication, fileScatter, documentation, boilerplateRatio, total, grade, details };
}
