import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import { parseConfig, DEFAULT_CONFIG, GuardianConfig } from './config';
import { detectAiGenerated, PullRequestFile, CommitInfo } from './detector';
import { scorepr } from './scorer';
import { formatReport } from './reporter';
import { computeLabels } from './labels';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const thresholdInput = core.getInput('threshold');
    const actionInput = core.getInput('action');
    const configPath = core.getInput('config-path');

    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.info('Not a pull request event — skipping');
      return;
    }

    const pr = context.payload.pull_request;
    const prNumber = pr.number as number;
    const prAuthor = (pr.user as { login: string }).login;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    let config: GuardianConfig = { ...DEFAULT_CONFIG };

    if (configPath) {
      const cfgFile = path.resolve(configPath);
      if (fs.existsSync(cfgFile)) {
        try {
          const raw = JSON.parse(fs.readFileSync(cfgFile, 'utf8')) as Record<string, unknown>;
          config = parseConfig(raw);
        } catch {
          core.warning('Failed to parse config file — using defaults');
        }
      }
    }

    if (thresholdInput) {
      const t = parseInt(thresholdInput, 10);
      if (!isNaN(t)) config.threshold = Math.max(0, Math.min(100, t));
    }
    if (actionInput && ['comment', 'label', 'close', 'all'].includes(actionInput)) {
      config.on_low_quality = actionInput as GuardianConfig['on_low_quality'];
    }

    if (config.ignore_authors.includes(prAuthor)) {
      core.info('Author ' + prAuthor + ' is in ignore list — skipping');
      return;
    }

    const filesResp = await octokit.rest.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100 });
    const files: PullRequestFile[] = filesResp.data.map(f => ({
      filename: f.filename,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
      status: f.status,
    }));

    const commitsResp = await octokit.rest.pulls.listCommits({ owner, repo, pull_number: prNumber, per_page: 100 });
    const commits: CommitInfo[] = commitsResp.data.map(c => ({ message: c.commit.message }));

    const totalAdditions = (pr.additions as number) ?? files.reduce((s, f) => s + f.additions, 0);
    const totalDeletions = (pr.deletions as number) ?? files.reduce((s, f) => s + f.deletions, 0);

    const detection = detectAiGenerated(files, commits, totalAdditions, totalDeletions);
    const score = scorepr(files, commits, config.ignore_paths);
    const report = formatReport(score, detection, prAuthor, config.threshold);
    const labels = computeLabels(score, detection, config);

    core.setOutput('score', String(score.total));
    core.setOutput('quality-grade', score.grade);
    core.setOutput('is-ai-generated', String(detection.isAiGenerated));
    core.setOutput('report', report);

    const shouldAct = score.total < config.threshold;
    const action = config.on_low_quality;

    if (action === 'comment' || action === 'all') {
      await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: report });
    }

    if (action === 'label' || action === 'all') {
      for (const label of labels.add) {
        try { await octokit.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: [label] }); } catch { /* label may not exist */ }
      }
    }

    if ((action === 'close' || action === 'all') && shouldAct) {
      await octokit.rest.pulls.update({ owner, repo, pull_number: prNumber, state: 'closed' });
      core.warning('Closed PR #' + prNumber + ' — quality score ' + score.total + ' below threshold ' + config.threshold);
    }

    if (score.total < config.threshold) {
      core.setFailed('PR quality score ' + score.total + '/100 is below threshold ' + config.threshold);
    } else {
      core.info('PR quality score ' + score.total + '/100 passed threshold ' + config.threshold);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
