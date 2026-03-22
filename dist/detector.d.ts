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
export declare function detectAiGenerated(files: PullRequestFile[], commits: CommitInfo[], totalAdditions: number, totalDeletions: number): DetectionResult;
