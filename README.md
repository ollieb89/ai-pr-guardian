# AI PR Guardian

Detect and score AI-generated pull requests. Automatically analyzes PRs for quality issues and provides constructive feedback.

## Features

- **AI Detection**: Identifies likely AI-generated PRs based on patterns in commits, titles, and descriptions
- **Quality Scoring**: Evaluates test coverage, documentation, and description quality (0-100)
- **Actionable Feedback**: Provides specific recommendations for improvement
- **Configurable Thresholds**: Set minimum quality scores to block low-quality PRs

## Quick Start

Add to your workflow:

```yaml
name: PR Quality Check
on: [pull_request]

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: ollieb89/ai-pr-guardian@v1.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on-low-score: '40'
```

## How It Works

### AI Detection

Scans for common patterns in AI-generated content:
- Generic commit message patterns
- Vague PR titles ("Fix bug", "Update code")
- Empty or cookie-cutter PR descriptions
- Suspiciously perfect grammar

### Quality Scoring

Evaluates three dimensions:
- **Test Coverage**: Are there test files in the PR?
- **Documentation**: Are there doc changes or detailed explanation?
- **Description**: Is the PR body informative?

Each dimension is scored 0-100, with the overall score being the average.

### Output

Posts a detailed comment on the PR showing:
- AI detection confidence (if applicable)
- Quality score breakdown
- Issues found
- Actionable recommendations

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token (usually `secrets.GITHUB_TOKEN`) | Required |
| `fail-on-low-score` | Quality score threshold to block PR (0-100) | `40` |

## Examples

### Block PRs below 50% quality

```yaml
- uses: ollieb89/ai-pr-guardian@v1.0.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-low-score: '50'
```

## Keywords

`github` `github-action` `ai` `pr` `pull-request` `quality` `code-review` `ai-detection` `slop` `code-quality`

## License

MIT - see LICENSE
