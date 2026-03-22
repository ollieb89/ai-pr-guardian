export interface GuardianConfig {
    threshold: number;
    on_low_quality: 'comment' | 'label' | 'close' | 'all';
    labels: {
        high: string;
        medium: string;
        low: string;
        'ai-generated': string;
    };
    ignore_authors: string[];
    ignore_paths: string[];
}
export declare const DEFAULT_CONFIG: GuardianConfig;
export declare function parseConfig(raw: Record<string, unknown>): GuardianConfig;
export declare function isIgnoredPath(filePath: string, patterns: string[]): boolean;
