import { ScoreBreakdown } from './scorer';
import { DetectionResult } from './detector';
import { GuardianConfig } from './config';

export interface LabelSet {
  add: string[];
  remove: string[];
}

export function computeLabels(
  score: ScoreBreakdown,
  detection: DetectionResult,
  config: GuardianConfig
): LabelSet {
  const add: string[] = [];
  const remove: string[] = [];

  if (score.total >= 70) {
    add.push(config.labels.high);
    remove.push(config.labels.medium, config.labels.low);
  } else if (score.total >= 40) {
    add.push(config.labels.medium);
    remove.push(config.labels.high, config.labels.low);
  } else {
    add.push(config.labels.low);
    remove.push(config.labels.high, config.labels.medium);
  }

  if (detection.isAiGenerated) {
    add.push(config.labels['ai-generated']);
  } else {
    remove.push(config.labels['ai-generated']);
  }

  return {
    add: [...new Set(add)],
    remove: [...new Set(remove.filter(l => !add.includes(l)))],
  };
}
