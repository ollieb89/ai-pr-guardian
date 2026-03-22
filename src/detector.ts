export interface PullRequestFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  status?: string;
}

export interface CommitInfo {
  message: string;
}

export interface DetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  signals: string[];
}

const BOILERPLATE_PATTERNS = [
  /TODO[:;]/gi,
  /\bplaceholder\b/gi,
  /throw new Error\(['"]Not implemented['"]\)/gi,
  /raise NotImplementedError/gi,
];

const GENERIC_COMMIT_PATTERNS = [
  /^(update|fix|add|change|modify|improve|refactor)\s+(file|files|code|the code|things|stuff|it)$/i,
  /^(wip|temp|tmp|test|testing|draft)$/i,
  /^\.$|^\.\.$/,
];

export function detectAiGenerated(
  files: PullRequestFile[],
  commits: CommitInfo[],
  totalAdditions: number,
  totalDeletions: number
): DetectionResult {
  const signals: string[] = [];
  let confidence = 0;

  let totalLines = 0;
  let boilerplateLines = 0;
  for (const file of files) {
    if (!file.patch) continue;
    const lines = file.patch.split('\n');
    totalLines += lines.length;
    for (const line of lines) {
      for (const pattern of BOILERPLATE_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          boilerplateLines += 1;
          break;
        }
      }
    }
  }
  if (totalLines > 0 && boilerplateLines / totalLines > 0.05) {
    signals.push('High boilerplate/TODO ratio (' + Math.round((boilerplateLines / totalLines) * 100) + '%)');
    confidence += 15;
  }

  if (totalAdditions > 200 && totalDeletions === 0) {
    signals.push('Large addition count with zero deletions (possible generation)');
    confidence += 20;
  }

  for (const file of files) {
    if (!file.patch) continue;
    const addedLines = file.patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.length);
    if (addedLines.length >= 10) {
      const avg = addedLines.reduce((a, b) => a + b, 0) / addedLines.length;
      const variance = addedLines.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / addedLines.length;
      if (variance < 20 && avg > 20) {
        signals.push('Suspiciously uniform line lengths in ' + file.filename);
        confidence += 10;
        break;
      }
    }
  }

  const genericCommits = commits.filter(c =>
    GENERIC_COMMIT_PATTERNS.some(p => { p.lastIndex = 0; return p.test(c.message.trim().split('\n')[0]); })
  );
  if (genericCommits.length > 0) {
    signals.push('Generic commit message(s): ' + genericCommits.map(c => JSON.stringify(c.message.split('\n')[0])).join(', '));
    confidence += genericCommits.length >= commits.length ? 20 : 10;
  }

  for (const file of files) {
    if (!file.patch) continue;
    const addedLines = file.patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    const lineSet = new Set(addedLines);
    if (addedLines.length >= 8 && lineSet.size / addedLines.length < 0.4) {
      signals.push('Highly repetitive code in ' + file.filename);
      confidence += 15;
      break;
    }
  }

  confidence = Math.min(100, confidence);
  const isAiGenerated = confidence >= 30;

  return { isAiGenerated, confidence, signals };
}
