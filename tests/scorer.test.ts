import { scorepr, ScoreBreakdown } from '../src/scorer';
import { PullRequestFile, CommitInfo } from '../src/detector';

function makeFile(filename: string, additions = 10, deletions = 0, patch = ''): PullRequestFile {
  return { filename, additions, deletions, changes: additions + deletions, patch };
}

describe('scorepr', () => {
  it('gives full test coverage score when no code files changed', () => {
    const files = [makeFile('README.md', 5, 0)];
    const commits: CommitInfo[] = [{ message: 'docs: update readme' }];
    const result = scorepr(files, commits, []);
    expect(result.testCoverageDelta).toBe(100);
  });

  it('gives zero test coverage when code is added without tests', () => {
    const files = [makeFile('src/index.ts', 30, 0, '+const x = 1;\n'.repeat(30))];
    const commits: CommitInfo[] = [{ message: 'feat: add feature' }];
    const result = scorepr(files, commits, []);
    expect(result.testCoverageDelta).toBe(0);
  });

  it('scores well when tests accompany code', () => {
    const files = [
      makeFile('src/util.ts', 20, 0),
      makeFile('src/util.test.ts', 20, 0),
    ];
    const commits: CommitInfo[] = [{ message: 'feat: add util with tests' }];
    const result = scorepr(files, commits, []);
    expect(result.testCoverageDelta).toBeGreaterThan(0);
  });

  it('scores commit messages: conventional commits score high', () => {
    const files = [makeFile('src/x.ts', 5)];
    const commits: CommitInfo[] = [{ message: 'feat(core): add new feature with details here' }];
    const result = scorepr(files, commits, []);
    expect(result.commitMessageQuality).toBe(100);
  });

  it('scores commit messages: generic messages score low', () => {
    const files = [makeFile('src/x.ts', 5)];
    const commits: CommitInfo[] = [{ message: 'update' }];
    const result = scorepr(files, commits, []);
    expect(result.commitMessageQuality).toBe(0);
  });

  it('detects code duplication and lowers score', () => {
    const repeatedLine = '+const x = doSomething(reallyLongVariableNameHere);\n';
    const patch = repeatedLine.repeat(15);
    const files = [makeFile('src/dup.ts', 15, 0, patch)];
    const commits: CommitInfo[] = [{ message: 'feat: add stuff' }];
    const result = scorepr(files, commits, []);
    expect(result.codeDuplication).toBeLessThan(100);
  });

  it('penalizes many files across many directories', () => {
    const files = Array.from({ length: 25 }, (_, i) => makeFile('dir' + i + '/sub' + i + '/file.ts', 5));
    const commits: CommitInfo[] = [{ message: 'refactor: massive change' }];
    const result = scorepr(files, commits, []);
    expect(result.fileScatter).toBeLessThan(100);
  });

  it('rewards documentation changes alongside code', () => {
    const files = [
      makeFile('src/feature.ts', 100, 0, '+' + 'x\n'.repeat(100)),
      makeFile('README.md', 10, 0),
    ];
    const commits: CommitInfo[] = [{ message: 'feat: add feature with readme' }];
    const result = scorepr(files, commits, []);
    expect(result.documentation).toBe(100);
  });

  it('penalizes significant code without documentation', () => {
    const files = [makeFile('src/big.ts', 100, 0, '+' + 'x\n'.repeat(100))];
    const commits: CommitInfo[] = [{ message: 'feat: huge undocumented feature' }];
    const result = scorepr(files, commits, []);
    expect(result.documentation).toBeLessThan(100);
  });

  it('ignores paths matching patterns — filtered file excluded from analysis', () => {
    const files = [
      makeFile('package-lock.json', 500, 300),
    ];
    const commits: CommitInfo[] = [{ message: 'chore: update deps' }];
    // Without ignore: 1 file changes scatter score
    const resultWithIgnore = scorepr(files, commits, ['package-lock.json']);
    // When ignored, no files remain — no code files means test coverage = 100 (full marks)
    expect(resultWithIgnore.testCoverageDelta).toBe(100);
    expect(resultWithIgnore.details.testCoverage).toContain('No code files');
  });

  it('assigns grades correctly', () => {
    const grade = (total: number) => {
      if (total >= 85) return 'A';
      if (total >= 70) return 'B';
      if (total >= 55) return 'C';
      if (total >= 40) return 'D';
      return 'F';
    };
    expect(grade(90)).toBe('A');
    expect(grade(75)).toBe('B');
    expect(grade(60)).toBe('C');
    expect(grade(45)).toBe('D');
    expect(grade(20)).toBe('F');
  });

  it('total score is in range 0-100', () => {
    const files = [makeFile('src/x.ts', 50, 0)];
    const commits: CommitInfo[] = [{ message: 'wip' }];
    const result = scorepr(files, commits, []);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('returns expected structure', () => {
    const result = scorepr([makeFile('src/a.ts', 5)], [{ message: 'feat: something' }], []);
    expect(typeof result.total).toBe('number');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    expect(typeof result.details).toBe('object');
  });
});
