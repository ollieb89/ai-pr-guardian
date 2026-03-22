import { ScoreBreakdown } from './scorer';
import { DetectionResult } from './detector';
export declare function formatReport(score: ScoreBreakdown, detection: DetectionResult, prAuthor: string, threshold: number): string;
