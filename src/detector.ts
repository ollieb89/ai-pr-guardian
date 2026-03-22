// Patterns that suggest AI-generated content

const AI_COMMIT_PATTERNS = [
  /^(feat|fix|refactor|docs|test|chore)(\(.+\))?:\s.{10,}$/i, // Very strict conventional commits
  /^(add|update|improve|fix|implement|create).*\b(feature|functionality|capability|implementation)\b/i,
  /^(remove|delete|clean|refactor).*\b(dead code|unused|legacy)\b/i,
];

const AI_PR_BODY_INDICATORS = [
  /^(this (pr|pull request|change) adds?|this implementation|this feature)\b/i,
  /^(the following changes|the changes include|this change includes)\b/i,
  /\b(comprehensive|thorough|complete|robust|efficient|optimal)\b.*\b(solution|implementation|approach)\b/i,
  /please review carefully|kindly review|thank you for reviewing/i,
];

const GENERIC_PATTERNS = [
  /^(update|fix|improve) (code|files|stuff|things)$/i,
  /^(various|misc) (changes|fixes|improvements)$/i,
  /^(work in progress|wip)$/i,
];

export interface DetectionResult {
  isLikelyAI: boolean;
  confidence: number; // 0-100
  signals: string[];
}

export function detectAIGenerated(
  commitMessages: string[],
  prTitle: string,
  prBody: string
): DetectionResult {
  const signals: string[] = [];
  let score = 0;

  // Check commit messages
  const allCommits = commitMessages.join('\n').toLowerCase();
  
  if (AI_COMMIT_PATTERNS.some(p => p.test(allCommits))) {
    signals.push('conventional-commits-pattern');
    score += 15;
  }

  if (commitMessages.length === 1 && commitMessages[0].length > 80) {
    signals.push('single-detailed-commit');
    score += 10;
  }

  // Check PR title
  if (GENERIC_PATTERNS.some(p => p.test(prTitle))) {
    signals.push('generic-title');
    score += 20;
  }

  // Check PR body
  if (prBody.length === 0) {
    signals.push('empty-pr-body');
    score += 15;
  } else if (AI_PR_BODY_INDICATORS.some(p => p.test(prBody))) {
    signals.push('generic-pr-language');
    score += 10;
  }

  // Check for suspiciously perfect grammar/tone
  const sentences = prBody.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 2 && sentences.every(s => s.trim().match(/^[A-Z]/))) {
    signals.push('perfect-grammar');
    score += 5;
  }

  return {
    isLikelyAI: score >= 30,
    confidence: Math.min(score, 100),
    signals,
  };
}
