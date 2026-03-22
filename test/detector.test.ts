import { detectAIGenerated } from '../src/detector.js';

// Basic test structure
const test = async (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

// Test cases
test('detects generic commit messages', () => {
  const result = detectAIGenerated(
    ['update code files'],
    'Fix bug',
    ''
  );
  assert(result.signals.includes('generic-title'), 'Should detect generic title');
});

test('detects empty PR body', () => {
  const result = detectAIGenerated(
    ['feat: add feature'],
    'Add Feature',
    ''
  );
  assert(result.signals.includes('empty-pr-body'), 'Should detect empty body');
});

test('scores human-written PR', () => {
  const result = detectAIGenerated(
    ['feat: implement user auth with JWT tokens'],
    'Implement user authentication',
    'Added JWT-based auth flow with refresh tokens. Includes unit tests and documentation.'
  );
  assert(result.confidence < 50, 'Should have low AI confidence');
});

console.log('\nAll tests passed!');
