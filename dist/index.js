import * as core from '@actions/core';
import * as github from '@actions/github';
import { detectAIGenerated } from './detector.js';
import { scoreQuality } from './scorer.js';
async function run() {
    try {
        const failThreshold = parseInt(core.getInput('fail-on-low-score'), 10);
        const token = core.getInput('github-token');
        const context = github.context;
        if (!context.payload.pull_request) {
            core.info('Not a PR context, skipping');
            return;
        }
        const octokit = github.getOctokit(token);
        const pr = context.payload.pull_request;
        // Fetch PR details
        const { data: prData } = await octokit.rest.pulls.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: pr.number,
        });
        // Get commits
        const { data: commits } = await octokit.rest.pulls.listCommits({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: pr.number,
        });
        const commitMessages = commits.map(c => c.commit.message);
        // Get changed files
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: pr.number,
        });
        const filesChanged = files.map(f => f.filename);
        const additions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
        const deletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0);
        // Detect AI generation
        const detection = detectAIGenerated(commitMessages, prData.title, prData.body || '');
        // Score quality
        const prContext = {
            title: prData.title,
            body: prData.body || '',
            filesChanged,
            additions,
            deletions,
            commits: commits.map(c => ({
                message: c.commit.message,
                filesChanged: c.files?.map(f => f.filename) || [],
            })),
        };
        const quality = scoreQuality(prContext);
        // Prepare comment
        let comment = '# 🛡️ AI PR Guardian Report\n\n';
        if (detection.isLikelyAI) {
            comment += `⚠️ **This PR appears to be AI-generated.** (Confidence: ${detection.confidence}%)\n\n`;
            comment += `**Detected signals:**\n${detection.signals.map(s => `- ${s}`).join('\n')}\n\n`;
        }
        comment += `## Quality Score: ${quality.overall}/100\n\n`;
        comment += `| Metric | Score |\n`;
        comment += `|--------|-------|\n`;
        comment += `| Test Coverage | ${quality.testCoverage}/100 |\n`;
        comment += `| Documentation | ${quality.documentation}/100 |\n`;
        comment += `| Description | ${quality.description}/100 |\n\n`;
        if (quality.issues.length > 0) {
            comment += `### Issues Found\n${quality.issues.map(i => `- ❌ ${i}`).join('\n')}\n\n`;
        }
        if (quality.recommendations.length > 0) {
            comment += `### Recommendations\n${quality.recommendations.map(r => `- 💡 ${r}`).join('\n')}\n\n`;
        }
        comment += `---\n*AI PR Guardian • [Documentation](https://github.com/ollieb89/ai-pr-guardian)*`;
        // Post comment
        await octokit.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: pr.number,
            body: comment,
        });
        core.info(`Quality score: ${quality.overall}/100`);
        core.info(`AI detection: ${detection.isLikelyAI ? 'likely AI-generated' : 'human-written'}`);
        // Fail if score is below threshold
        if (quality.overall < failThreshold) {
            core.setFailed(`Quality score (${quality.overall}) is below threshold (${failThreshold})`);
        }
    }
    catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}
run();
