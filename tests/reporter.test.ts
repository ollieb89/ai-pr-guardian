import { formatReport } from '../src/reporter';
import { ScoreBreakdown } from '../src/scorer';
import { DetectionResult } from '../src/detector';

function makeScore(total: number, grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'B'): ScoreBreakdown {
  return {
    total,
    grade,
    testCoverageDelta: 80,
    commitMessageQuality: 75,
    codeDuplication: 90,
    fileScatter: 100,
    documentation: 100,
    boilerplateRatio: 100,
    details: {
      testCoverage: 'some tests',
      commitMessages: '2 commits, avg score 75',
      duplication: '5% duplicate lines',
      scatter: '3 files in 2 directories',
      documentation: 'Documentation updated',
      boilerplate: 'No boilerplate',
    },
  };
}

function makeDetection(isAi = false, confidence = 0): DetectionResult {
  return { isAiGenerated: isAi, confidence, signals: isAi ? ['Generic commit message'] : [] };
}

describe('formatReport', () => {
  it('includes quality score', () => {
    const report = formatReport(makeScore(78), makeDetection(), 'devuser', 60);
    expect(report).toContain('78/100');
  });

  it('shows grade', () => {
    const report = formatReport(makeScore(78, 'B'), makeDetection(), 'devuser', 60);
    expect(report).toContain('B');
  });

  it('shows passed when score above threshold', () => {
    const report = formatReport(makeScore(78), makeDetection(), 'devuser', 60);
    expect(report).toContain('Quality Gate Passed');
  });

  it('shows failed when score below threshold', () => {
    const report = formatReport(makeScore(40, 'D'), makeDetection(), 'devuser', 60);
    expect(report).toContain('Quality Gate Failed');
  });

  it('shows AI detection signal when flagged', () => {
    const report = formatReport(makeScore(50, 'C'), makeDetection(true, 45), 'devuser', 60);
    expect(report).toContain('AI-generated');
    expect(report).toContain('AI Detection Signals');
  });

  it('shows human-authored when not flagged', () => {
    const report = formatReport(makeScore(80), makeDetection(false, 5), 'devuser', 60);
    expect(report).toContain('Human-authored');
  });

  it('includes author', () => {
    const report = formatReport(makeScore(80), makeDetection(), 'myuser', 60);
    expect(report).toContain('@myuser');
  });

  it('includes all score dimensions', () => {
    const report = formatReport(makeScore(80), makeDetection(), 'devuser', 60);
    expect(report).toContain('Test Coverage Delta');
    expect(report).toContain('Commit Message Quality');
    expect(report).toContain('Code Duplication');
    expect(report).toContain('File Scatter');
    expect(report).toContain('Documentation');
    expect(report).toContain('Boilerplate Ratio');
  });

  it('includes powered by link', () => {
    const report = formatReport(makeScore(80), makeDetection(), 'devuser', 60);
    expect(report).toContain('ai-pr-guardian');
    expect(report).toContain('github.com/ollieb89/ai-pr-guardian');
  });
});
