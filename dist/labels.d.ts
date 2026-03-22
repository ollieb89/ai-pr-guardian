import { ScoreBreakdown } from './scorer';
import { DetectionResult } from './detector';
import { GuardianConfig } from './config';
export interface LabelSet {
    add: string[];
    remove: string[];
}
export declare function computeLabels(score: ScoreBreakdown, detection: DetectionResult, config: GuardianConfig): LabelSet;
