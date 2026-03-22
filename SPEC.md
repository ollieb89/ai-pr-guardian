# ai-pr-guardian — Spec

## What
GitHub Action that detects, scores, and gates AI-generated / low-quality PRs.

## Problem
AI-generated PRs (slop) flood open-source repos. Maintainers waste time reviewing garbage. Existing solutions (anti-slop, 531★) only detect-and-close. No scoring, no policies, no configurability.

## Features (MVP v1.0.0)
1. **PR Quality Score** (0-100) — analyzes diff patterns, commit messages, test coverage, code style
2. **AI Detection Heuristics** — repetitive patterns, boilerplate ratios, suspiciously large diffs with no tests
3. **Configurable Policies** — YAML config for thresholds, auto-label, auto-comment, auto-close
4. **PR Comment Report** — posts a detailed quality breakdown as a PR comment
5. **Label Management** — auto-applies labels like `needs-review`, `low-quality`, `ai-generated`

## Architecture
- TypeScript GitHub Action
- No external API calls (runs entirely on PR diff analysis — no LLM dependency)
- Inputs: threshold, action (comment|label|close|all), config-path
- Outputs: score, quality-grade, is-ai-generated, report

## Scoring Dimensions
- **Test Coverage Delta** — PR adds code but no tests? Score drops.
- **Commit Message Quality** — Generic messages like "Update file" score low.
- **Code Duplication** — High repetition in diff = lower score.
- **File Scatter** — Too many unrelated files changed = lower score.
- **Documentation** — No README/comment updates for new features = lower score.
- **Boilerplate Ratio** — High ratio of generated/template code detected.

## Config Example (.github/ai-pr-guardian.yml)
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

## Deliverables
- action.yml
- src/ (TypeScript)
- tests/ (Jest, 20+ tests)
- README.md (with badges, usage examples, config reference)
- LICENSE (MIT)
- .github/workflows/ (workflow-guardian CI + self-test)
- Tag v1.0.0, GitHub Release

## SEO Topics
ai, github-actions, code-quality, pull-request, anti-slop, ai-detection, code-review, automation, developer-tools, open-source
