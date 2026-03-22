"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.parseConfig = parseConfig;
exports.isIgnoredPath = isIgnoredPath;
exports.DEFAULT_CONFIG = {
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
function parseConfig(raw) {
    const config = { ...exports.DEFAULT_CONFIG, labels: { ...exports.DEFAULT_CONFIG.labels } };
    if (typeof raw.threshold === 'number') {
        config.threshold = Math.max(0, Math.min(100, raw.threshold));
    }
    if (raw.on_low_quality === 'comment' || raw.on_low_quality === 'label' || raw.on_low_quality === 'close' || raw.on_low_quality === 'all') {
        config.on_low_quality = raw.on_low_quality;
    }
    if (raw.labels && typeof raw.labels === 'object' && !Array.isArray(raw.labels)) {
        config.labels = { ...config.labels, ...raw.labels };
    }
    if (Array.isArray(raw.ignore_authors)) {
        config.ignore_authors = raw.ignore_authors.filter((x) => typeof x === 'string');
    }
    if (Array.isArray(raw.ignore_paths)) {
        config.ignore_paths = raw.ignore_paths.filter((x) => typeof x === 'string');
    }
    return config;
}
function isIgnoredPath(filePath, patterns) {
    for (const pattern of patterns) {
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        if (new RegExp('^' + escaped + '$').test(filePath) || new RegExp(escaped + '$').test(filePath)) {
            return true;
        }
    }
    return false;
}
