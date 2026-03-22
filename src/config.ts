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

export const DEFAULT_CONFIG: GuardianConfig = {
  threshold: 60,
  on_low_quality: 'comment',
  labels: {
    high: 'quality:high',
    medium: 'quality:medium',
    low: 'quality:low',
    'ai-generated': 'ai-generated',
  },
  ignore_authors: ['dependabot[bot]', 'renovate[bot]'],
  ignore_paths: ['*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
};

export function parseConfig(raw: Record<string, unknown>): GuardianConfig {
  const config = { ...DEFAULT_CONFIG, labels: { ...DEFAULT_CONFIG.labels } };

  if (typeof raw.threshold === 'number') {
    config.threshold = Math.max(0, Math.min(100, raw.threshold));
  }
  if (raw.on_low_quality === 'comment' || raw.on_low_quality === 'label' || raw.on_low_quality === 'close' || raw.on_low_quality === 'all') {
    config.on_low_quality = raw.on_low_quality;
  }
  if (raw.labels && typeof raw.labels === 'object' && !Array.isArray(raw.labels)) {
    config.labels = { ...config.labels, ...(raw.labels as Partial<GuardianConfig['labels']>) };
  }
  if (Array.isArray(raw.ignore_authors)) {
    config.ignore_authors = (raw.ignore_authors as unknown[]).filter((x): x is string => typeof x === 'string');
  }
  if (Array.isArray(raw.ignore_paths)) {
    config.ignore_paths = (raw.ignore_paths as unknown[]).filter((x): x is string => typeof x === 'string');
  }

  return config;
}

export function isIgnoredPath(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    if (new RegExp('^' + escaped + '$').test(filePath) || new RegExp(escaped + '$').test(filePath)) {
      return true;
    }
  }
  return false;
}
