export interface QualityScore {
  overall: number; // 0-100
  testCoverage: number;
  documentation: number;
  description: number;
  issues: string[];
  recommendations: string[];
}

export interface PRContext {
  title: string;
  body: string;
  filesChanged: string[];
  additions: number;
  deletions: number;
  commits: Array<{ message: string; filesChanged: string[] }>;
}

export function scoreQuality(context: PRContext): QualityScore {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let scores = {
    testCoverage: 0,
    documentation: 0,
    description: 0,
  };

  // Score test coverage
  const hasTestFiles = context.filesChanged.some(f =>
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f) ||
    /^test(s)?\//.test(f) ||
    /^__tests__\//.test(f)
  );

  if (!hasTestFiles) {
    issues.push('No test files changed');
    recommendations.push('Add tests for any new functionality or logic changes');
    scores.testCoverage = 20;
  } else {
    scores.testCoverage = 80;
  }

  // Score documentation
  const hasDocChanges = context.filesChanged.some(f =>
    /\.(md|mdx|txt)$|readme|doc/i.test(f)
  );

  const prHasExplanation = context.body.length > 100;

  if (!hasDocChanges && !prHasExplanation) {
    issues.push('No documentation or detailed explanation');
    recommendations.push('Add comments, update README, or provide more context in the PR body');
    scores.documentation = 30;
  } else if (hasDocChanges || prHasExplanation) {
    scores.documentation = 75;
  }

  // Score description quality
  if (context.body.length < 20) {
    issues.push('PR description is too brief');
    recommendations.push('Explain what changed and why');
    scores.description = 10;
  } else if (context.body.length < 100) {
    recommendations.push('Consider adding more detail about motivation and approach');
    scores.description = 50;
  } else {
    scores.description = 85;
  }

  // Check for meaningful commit messages
  const meaningfulCommits = context.commits.filter(c => c.message.length > 10).length;
  if (meaningfulCommits === 0) {
    issues.push('Commit messages lack detail');
    recommendations.push('Use clear, descriptive commit messages');
  }

  // Check for very large changes without explanation
  const changedLines = context.additions + context.deletions;
  if (changedLines > 1000 && context.body.length < 150) {
    issues.push('Large change with minimal explanation');
    recommendations.push('For major changes, provide more detail about the approach');
  }

  // Bonus: clear, focused changes
  if (context.filesChanged.length < 10 && context.body.length > 100) {
    recommendations.push('✓ Well-focused change with clear explanation');
  }

  const overall = Math.round(
    (scores.testCoverage + scores.documentation + scores.description) / 3
  );

  return {
    overall,
    ...scores,
    issues,
    recommendations,
  };
}
