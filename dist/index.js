"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("./config");
const detector_1 = require("./detector");
const scorer_1 = require("./scorer");
const reporter_1 = require("./reporter");
const labels_1 = require("./labels");
async function run() {
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
        const prNumber = pr.number;
        const prAuthor = pr.user.login;
        const owner = context.repo.owner;
        const repo = context.repo.repo;
        let config = { ...config_1.DEFAULT_CONFIG };
        if (configPath) {
            const cfgFile = path.resolve(configPath);
            if (fs.existsSync(cfgFile)) {
                try {
                    const raw = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
                    config = (0, config_1.parseConfig)(raw);
                }
                catch {
                    core.warning('Failed to parse config file — using defaults');
                }
            }
        }
        if (thresholdInput) {
            const t = parseInt(thresholdInput, 10);
            if (!isNaN(t))
                config.threshold = Math.max(0, Math.min(100, t));
        }
        if (actionInput && ['comment', 'label', 'close', 'all'].includes(actionInput)) {
            config.on_low_quality = actionInput;
        }
        if (config.ignore_authors.includes(prAuthor)) {
            core.info('Author ' + prAuthor + ' is in ignore list — skipping');
            return;
        }
        const filesResp = await octokit.rest.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100 });
        const files = filesResp.data.map(f => ({
            filename: f.filename,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
            patch: f.patch,
            status: f.status,
        }));
        const commitsResp = await octokit.rest.pulls.listCommits({ owner, repo, pull_number: prNumber, per_page: 100 });
        const commits = commitsResp.data.map(c => ({ message: c.commit.message }));
        const totalAdditions = pr.additions ?? files.reduce((s, f) => s + f.additions, 0);
        const totalDeletions = pr.deletions ?? files.reduce((s, f) => s + f.deletions, 0);
        const detection = (0, detector_1.detectAiGenerated)(files, commits, totalAdditions, totalDeletions);
        const score = (0, scorer_1.scorepr)(files, commits, config.ignore_paths);
        const report = (0, reporter_1.formatReport)(score, detection, prAuthor, config.threshold);
        const labels = (0, labels_1.computeLabels)(score, detection, config);
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
                try {
                    await octokit.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: [label] });
                }
                catch { /* label may not exist */ }
            }
        }
        if ((action === 'close' || action === 'all') && shouldAct) {
            await octokit.rest.pulls.update({ owner, repo, pull_number: prNumber, state: 'closed' });
            core.warning('Closed PR #' + prNumber + ' — quality score ' + score.total + ' below threshold ' + config.threshold);
        }
        if (score.total < config.threshold) {
            core.setFailed('PR quality score ' + score.total + '/100 is below threshold ' + config.threshold);
        }
        else {
            core.info('PR quality score ' + score.total + '/100 passed threshold ' + config.threshold);
        }
    }
    catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}
run();
