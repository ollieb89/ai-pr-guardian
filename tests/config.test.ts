import { parseConfig, isIgnoredPath, DEFAULT_CONFIG } from '../src/config';

describe('parseConfig', () => {
  it('returns default config when given empty object', () => {
    const cfg = parseConfig({});
    expect(cfg.threshold).toBe(60);
    expect(cfg.on_low_quality).toBe('comment');
  });

  it('parses threshold correctly', () => {
    expect(parseConfig({ threshold: 80 }).threshold).toBe(80);
  });

  it('clamps threshold to 0-100', () => {
    expect(parseConfig({ threshold: -10 }).threshold).toBe(0);
    expect(parseConfig({ threshold: 150 }).threshold).toBe(100);
  });

  it('parses on_low_quality for all valid values', () => {
    for (const val of ['comment', 'label', 'close', 'all'] as const) {
      expect(parseConfig({ on_low_quality: val }).on_low_quality).toBe(val);
    }
  });

  it('ignores invalid on_low_quality', () => {
    expect(parseConfig({ on_low_quality: 'invalid' }).on_low_quality).toBe('comment');
  });

  it('parses custom labels', () => {
    const cfg = parseConfig({ labels: { high: 'good', low: 'bad' } });
    expect(cfg.labels.high).toBe('good');
    expect(cfg.labels.low).toBe('bad');
    expect(cfg.labels.medium).toBe(DEFAULT_CONFIG.labels.medium);
  });

  it('parses ignore_authors list', () => {
    const cfg = parseConfig({ ignore_authors: ['bot[bot]', 'ci'] });
    expect(cfg.ignore_authors).toEqual(['bot[bot]', 'ci']);
  });

  it('parses ignore_paths list', () => {
    const cfg = parseConfig({ ignore_paths: ['dist/**', '*.min.js'] });
    expect(cfg.ignore_paths).toEqual(['dist/**', '*.min.js']);
  });
});

describe('isIgnoredPath', () => {
  it('matches exact filename', () => {
    expect(isIgnoredPath('package-lock.json', ['package-lock.json'])).toBe(true);
  });

  it('matches wildcard extension', () => {
    expect(isIgnoredPath('yarn.lock', ['*.lock'])).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isIgnoredPath('src/index.ts', ['*.lock'])).toBe(false);
  });

  it('matches nested lock file via suffix pattern', () => {
    expect(isIgnoredPath('some/deep/yarn.lock', ['*.lock'])).toBe(true);
  });
});
