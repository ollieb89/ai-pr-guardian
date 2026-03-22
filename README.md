# ai-pr-guardian

[![CI](https://github.com/ollieb89/ai-pr-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/ollieb89/ai-pr-guardian/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ollieb89/ai-pr-guardian)](https://github.com/ollieb89/ai-pr-guardian/releases)

> **GitHub Action that detects, scores, and gates AI-generated and low-quality PRs.**

AI-generated PRs (slop) flood open-source repos. Maintainers waste time reviewing garbage. `ai-pr-guardian` analyzes your PR diff, commits, and structure to produce a 0–100 quality score — no LLM API calls required.

## Features

- **Quality Score (0–100)** — multi-dimensional scoring across test coverage, commit quality, duplication, scatter, docs, and boilerplate
- **AI Detection** — heuristic signals: generic commits, repetitive patches, zero-deletion dumps, boilerplate ratios, uniform line lengths
- **Configurable Policy** — thresholds, auto-comment, auto-label, auto-close, or all
- **PR Comment Report** — detailed markdown breakdown posted to the PR
- **Label Management** — automatically applies/removes `quality:high`, `quality:medium`, `quality:low`, `ai-generated`
- **Zero external APIs** — runs entirely on PR diff analysis, no LLM dependency

## Quick Start

```yaml
# .github/workflows/pr-guardian.yml
name: PR Guardian
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  guard:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
      contents: read
    steps:
      - uses: ollieb89/ai-pr-guardian@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          threshold: 60
          action: comment
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token with PR read/write permissions | `${{ github.token }}` |
| `threshold` | Minimum quality score (0–100) required to pass | `60` |
| `action` | Action on low-quality PRs: `comment`, `label`, `close`, `all` | `comment` |
| `config-path` | Path to config file | `.github/ai-pr-guardian.yml` |

## Outputs

| Output | Description |
|--------|-------------|
| `score` | Quality score (0–100) |
| `quality-grade` | Grade: A, B, C, D, or F |
| `is-ai-generated` | `true` / `false` |
| `report` | Full markdown quality report |

## Configuration

Create `.github/ai-pr-guardian.yml` for fine-grained control:

```yaml
threshold: 60
on_low_quality: comment  # comment | label | close | all
labels:
  high: "quality:high"
  medium: "quality:medium"
  low: "quality:low"
  ai-generated: "ai-generated"
ignore_authors:
  - dependabot[bot]
  - renovate[bot]
ignore_paths:
  - "*.lock"
  - "package-lock.json"
```

## Scoring Dimensions

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Test Coverage Delta | 25% | Code added without tests? Score drops |
| Commit Message Quality | 20% | Generic messages like "update files" score 0 |
| Code Duplication | 20% | High repetition in diff = lower score |
| File Scatter | 15% | Too many unrelated files changed = lower score |
| Documentation | 10% | Significant code additions with no README/doc updates |
| Boilerplate Ratio | 10% | TODO, placeholder, "Not implemented" code |

## AI Detection Signals

- Generic commit messages (`update`, `fix`, `wip`, etc.)
- Large additions with zero deletions
- Suspiciously uniform line lengths in patches
- High boilerplate/TODO ratio
- Highly repetitive code blocks

## Example PR Comment

```
## 🛡️ ai-pr-guardian Report

| Metric | Value |
|--------|-------|
| Quality Score | 42/100 |
| Grade | 🔴 D |
| AI Detection | 🤖 Likely AI-generated (45% confidence) |
| Author | @contributor |
| Threshold | 60 |

### ⚠️ Quality Gate Failed

This PR scored **42/100**, below the configured threshold of **60**.

Suggested improvements:
- Add tests for new code
- Improve commit messages (use Conventional Commits format)
```

## Grades

| Grade | Score Range |
|-------|------------|
| 🟢 A | 85–100 |
| 🟡 B | 70–84 |
| 🟠 C | 55–69 |
| 🔴 D | 40–54 |
| 💀 F | 0–39 |

## Use All Actions

```yaml
- uses: ollieb89/ai-pr-guardian@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    threshold: 50
    action: all  # comment + label + close on failure
```

## License

MIT — see [LICENSE](LICENSE)


---
## Part of the AI DevOps Actions suite

This action is one of five tools that form the **[AI DevOps Actions](https://github.com/ollieb89/ai-devops-actions)** suite — the CI/CD layer for AI-native development.

| Action | Purpose |
|--------|---------|
| [ai-pr-guardian](https://github.com/ollieb89/ai-pr-guardian) | Gate low-quality and AI-generated PRs |
| [llm-cost-tracker](https://github.com/ollieb89/llm-cost-tracker) | Track AI API costs in CI, alert on overruns |
| [mcp-server-tester](https://github.com/ollieb89/mcp-server-tester) | Validate MCP servers: health, compliance, discovery |
| [actions-lockfile-generator](https://github.com/ollieb89/actions-lockfile-generator) | Pin Actions to SHA, prevent supply chain attacks |
| [agent-skill-validator](https://github.com/ollieb89/agent-skill-validator) | Lint and validate agent skill repos |

→ [View the full suite and pipeline example](https://github.com/ollieb89/ai-devops-actions)
