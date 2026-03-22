import { PullRequestFile, CommitInfo } from './detector';
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
export declare function scorepr(files: PullRequestFile[], commits: CommitInfo[], ignorePaths: string[]): ScoreBreakdown;
