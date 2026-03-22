import { computeLabels } from '../src/labels';
import { DEFAULT_CONFIG } from '../src/config';
import { ScoreBreakdown } from '../src/scorer';
import { DetectionResult } from '../src/detector';

function makeScore(total: number): ScoreBreakdown {
  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';
  return { total, grade, testCoverageDelta: 80, commitMessageQuality: 80, codeDuplication: 80, fileScatter: 80, documentation: 80, boilerplateRatio: 80, details: {} };
}
function makeDetection(isAi: boolean): DetectionResult {
  return { isAiGenerated: isAi, confidence: isAi ? 50 : 0, signals: [] };
}

describe('computeLabels', () => {
  it('applies high quality label when score >= 70', () => {
    const result = computeLabels(makeScore(80), makeDetection(false), DEFAULT_CONFIG);
    expect(result.add).toContain('quality:high');
    expect(result.remove).not.toContain('quality:high');
  });

  it('applies medium quality label when score 40-69', () => {
    const result = computeLabels(makeScore(55), makeDetection(false), DEFAULT_CONFIG);
    expect(result.add).toContain('quality:medium');
    expect(result.remove).toContain('quality:high');
    expect(result.remove).toContain('quality:low');
  });

  it('applies low quality label when score < 40', () => {
    const result = computeLabels(makeScore(25), makeDetection(false), DEFAULT_CONFIG);
    expect(result.add).toContain('quality:low');
    expect(result.remove).toContain('quality:high');
    expect(result.remove).toContain('quality:medium');
  });

  it('applies ai-generated label when detected', () => {
    const result = computeLabels(makeScore(50), makeDetection(true), DEFAULT_CONFIG);
    expect(result.add).toContain('ai-generated');
    expect(result.remove).not.toContain('ai-generated');
  });

  it('removes ai-generated label when not detected', () => {
    const result = computeLabels(makeScore(80), makeDetection(false), DEFAULT_CONFIG);
    expect(result.add).not.toContain('ai-generated');
    expect(result.remove).toContain('ai-generated');
  });

  it('no label appears in both add and remove', () => {
    const result = computeLabels(makeScore(75), makeDetection(true), DEFAULT_CONFIG);
    for (const label of result.add) {
      expect(result.remove).not.toContain(label);
    }
  });

  it('works with custom label config', () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      labels: { high: 'lgtm', medium: 'needs-work', low: 'reject', 'ai-generated': 'robot' },
    };
    const result = computeLabels(makeScore(85), makeDetection(true), customConfig);
    expect(result.add).toContain('lgtm');
    expect(result.add).toContain('robot');
    expect(result.remove).toContain('needs-work');
    expect(result.remove).toContain('reject');
  });
});
