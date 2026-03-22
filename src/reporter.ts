import { ScoreBreakdown } from './scorer';
import { DetectionResult } from './detector';

export function formatReport(
  score: ScoreBreakdown,
  detection: DetectionResult,
  prAuthor: string,
  threshold: number
): string {
  const gradeEmoji: Record<string, string> = { A: '🟢', B: '🟡', C: '🟠', D: '🔴', F: '💀' };
  const aiEmoji = detection.isAiGenerated ? '🤖' : '👤';

  const lines = [
    '## 🛡️ ai-pr-guardian Report',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    '| **Quality Score** | ' + score.total + '/100 |',
    '| **Grade** | ' + gradeEmoji[score.grade] + ' ' + score.grade + ' |',
    '| **AI Detection** | ' + aiEmoji + ' ' + (detection.isAiGenerated ? 'Likely AI-generated (' + detection.confidence + '% confidence)' : 'Human-authored') + ' |',
    '| **Author** | @' + prAuthor + ' |',
    '| **Threshold** | ' + threshold + ' |',
    '',
    '### 📊 Score Breakdown',
    '',
    '| Dimension | Score | Weight | Notes |',
    '|-----------|-------|--------|-------|',
    '| Test Coverage Delta | ' + score.testCoverageDelta + '/100 | 25% | ' + score.details.testCoverage + ' |',
    '| Commit Message Quality | ' + score.commitMessageQuality + '/100 | 20% | ' + score.details.commitMessages + ' |',
    '| Code Duplication | ' + score.codeDuplication + '/100 | 20% | ' + score.details.duplication + ' |',
    '| File Scatter | ' + score.fileScatter + '/100 | 15% | ' + score.details.scatter + ' |',
    '| Documentation | ' + score.documentation + '/100 | 10% | ' + score.details.documentation + ' |',
    '| Boilerplate Ratio | ' + score.boilerplateRatio + '/100 | 10% | ' + score.details.boilerplate + ' |',
    '',
  ];

  if (detection.signals.length > 0) {
    lines.push('### 🔍 AI Detection Signals', '');
    for (const signal of detection.signals) {
      lines.push('- ' + signal);
    }
    lines.push('');
  }

  if (score.total < threshold) {
    lines.push(
      '### ⚠️ Quality Gate Failed',
      '',
      'This PR scored **' + score.total + '/100**, below the configured threshold of **' + threshold + '**.',
      '',
      '**Suggested improvements:**',
    );
    if (score.testCoverageDelta < 50) lines.push('- Add tests for new code');
    if (score.commitMessageQuality < 50) lines.push('- Improve commit messages (use Conventional Commits format)');
    if (score.codeDuplication < 50) lines.push('- Reduce code duplication');
    if (score.fileScatter < 50) lines.push('- Consider splitting this PR into smaller, focused changes');
    if (score.documentation < 50) lines.push('- Update documentation for new features');
    if (score.boilerplateRatio < 50) lines.push('- Remove placeholder/TODO code before submitting');
    lines.push('');
  } else {
    lines.push('### ✅ Quality Gate Passed', '', 'This PR scored **' + score.total + '/100** (threshold: ' + threshold + ').', '');
  }

  lines.push('---', '*Powered by [ai-pr-guardian](https://github.com/ollieb89/ai-pr-guardian)*');

  return lines.join('\n');
}
