import { detectAiGenerated, PullRequestFile, CommitInfo } from '../src/detector';

function makeFile(filename: string, patch: string, additions = 10, deletions = 0): PullRequestFile {
  return { filename, additions, deletions, changes: additions + deletions, patch };
}

describe('detectAiGenerated', () => {
  it('returns not AI-generated for a clean PR', () => {
    const files = [makeFile('src/foo.ts', '+const x = 1;\n+console.log(x);', 2)];
    const commits: CommitInfo[] = [{ message: 'feat(core): add meaningful feature with context' }];
    const result = detectAiGenerated(files, commits, 2, 0);
    expect(result.isAiGenerated).toBe(false);
    expect(result.confidence).toBeLessThan(30);
  });

  it('flags large additions with zero deletions', () => {
    const files = [makeFile('src/generated.ts', '+'.repeat(100), 250)];
    const commits: CommitInfo[] = [{ message: 'feat: add stuff' }];
    const result = detectAiGenerated(files, commits, 250, 0);
    expect(result.signals.some(s => s.includes('Large addition'))).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(20);
  });

  it('flags generic commit messages', () => {
    const files = [makeFile('src/x.ts', '+const y = 1;', 1)];
    const commits: CommitInfo[] = [{ message: 'update files' }];
    const result = detectAiGenerated(files, commits, 1, 0);
    expect(result.signals.some(s => s.includes('Generic commit'))).toBe(true);
  });

  it('flags high boilerplate ratio', () => {
    const patch = Array(20).fill('+// TODO: implement this').join('\n') + '\n+const x = 1;';
    const files = [makeFile('src/todo.ts', patch, 21)];
    const commits: CommitInfo[] = [{ message: 'feat: add feature' }];
    const result = detectAiGenerated(files, commits, 21, 0);
    expect(result.signals.some(s => s.includes('boilerplate'))).toBe(true);
  });

  it('flags repetitive code patterns', () => {
    const repeatedLine = '+const x = doSomething();\n';
    const patch = repeatedLine.repeat(12);
    const files = [makeFile('src/rep.ts', patch, 12)];
    const commits: CommitInfo[] = [{ message: 'feat: repetitive feature' }];
    const result = detectAiGenerated(files, commits, 12, 0);
    expect(result.signals.some(s => s.includes('repetitive'))).toBe(true);
  });

  it('caps confidence at 100', () => {
    const patch = Array(30).fill('+// TODO: implement').join('\n');
    const files = [makeFile('src/x.ts', patch, 500)];
    const commits: CommitInfo[] = [{ message: 'update files' }];
    const result = detectAiGenerated(files, commits, 500, 0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('returns empty signals for a clearly human PR', () => {
    const files = [makeFile('src/logic.ts', '+export function add(a: number, b: number): number {\n+  return a + b;\n+}', 3, 1)];
    const commits: CommitInfo[] = [{ message: 'feat(math): implement add utility function' }];
    const result = detectAiGenerated(files, commits, 3, 1);
    expect(result.signals.length).toBe(0);
  });
});
