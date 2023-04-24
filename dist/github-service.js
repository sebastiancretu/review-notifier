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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const slackify_markdown_1 = __importDefault(require("slackify-markdown"));
const client_1 = __importDefault(require("./client"));
const string_1 = require("./utils/string");
const user_mapping_1 = require("./utils/user-mapping");
class GithubService {
    constructor() {
        this.pullRequest = null;
        this.getPullRequest().then(() => this.extractSlackTs());
    }
    static getInstance() {
        if (!GithubService.instance) {
            GithubService.instance = new GithubService();
        }
        return GithubService.instance;
    }
    async extractSlackTs() {
        if (!this.pullRequest) {
            throw Error('No pull_request');
        }
        if (this.slackMessageId) {
            return this.slackMessageId;
        }
        const comments = await client_1.default.getOctokit().rest.issues.listComments({
            owner: this.pullRequest.owner,
            repo: this.pullRequest.repo,
            issue_number: this.pullRequest.number,
        });
        const slackTs = comments.data
            .map((comment) => comment.body?.match(/SLACK_MESSAGE_ID:[0-9]{1,}.[0-9]{1,}/))
            .find((match) => match)?.[0];
        this.slackMessageId = slackTs;
        return this.slackMessageId;
    }
    async addSlackTsComment(ts) {
        if (!this.pullRequest || !this.pullRequest.reviewersCount) {
            return;
        }
        return await client_1.default.getOctokit().rest.issues.createComment({
            owner: this.pullRequest.owner,
            repo: this.pullRequest.repo,
            issue_number: this.pullRequest.number,
            body: `SLACK_MESSAGE_ID:${ts}`,
        });
    }
    async getPullRequest() {
        if (this.pullRequest) {
            return this.pullRequest;
        }
        let pullRequest;
        if (github_1.context.payload?.pull_request) {
            pullRequest = github_1.context.payload.pull_request;
        }
        else if (github_1.context.payload?.issue) {
            const { data } = await client_1.default.getOctokit().rest.pulls.get({
                owner: github_1.context.repo.owner,
                repo: github_1.context.repo.repo,
                pull_number: github_1.context.payload.issue.number,
            });
            pullRequest = data;
        }
        else {
            throw new Error('Missing pull request information in the payload');
        }
        const { awsBucket, awsObjectKey, awsRegion } = client_1.default.getInputs();
        const usersMapping = await (0, user_mapping_1.getUsersMapping)({
            bucket: awsBucket,
            key: awsObjectKey,
            region: awsRegion,
        });
        this.pullRequest = {
            author: pullRequest.user?.login ?? 'unknown',
            title: pullRequest.title,
            body: (0, string_1.trimToWords)((0, slackify_markdown_1.default)(pullRequest.body ?? ''), Number(client_1.default.getInputs().maxBodyWordCount)),
            href: pullRequest?.html_url,
            number: Number(pullRequest?.number),
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            reviewersCount: pullRequest.requested_reviewers?.length ?? 0,
            reviewers: pullRequest.requested_reviewers?.map((user) => user.login) ?? [],
            labels: pullRequest.labels.map((label) => label.name),
            action: pullRequest.merged
                ? 'merged'
                : pullRequest.draft
                    ? 'draft'
                    : github_1.context.payload.event.action,
            state: pullRequest.state,
            ref: github_1.context.ref,
            eventName: github_1.context.eventName,
            usersMapping: usersMapping.engineers,
        };
        return this.pullRequest;
    }
    isActionOnBaseBranch() {
        let baseRef;
        let headRef;
        switch (github_1.context.eventName) {
            case 'pull_request':
                baseRef = github_1.context.payload.pull_request?.base?.ref;
                headRef = github_1.context.payload.pull_request?.head?.ref;
                break;
            case 'push':
                baseRef = github_1.context.payload.ref?.replace('refs/heads/', '');
                headRef = github_1.context.payload.before?.slice(0, 7);
                break;
            default:
                core.warning(`Unsupported event type: ${github_1.context.eventName}`);
                return false;
        }
        if (headRef && baseRef && headRef === baseRef) {
            core.info(`Action is on base branch (${baseRef})`);
            return true;
        }
        else {
            core.info(`Action is not on base branch (${baseRef})`);
            return false;
        }
    }
}
exports.default = GithubService.getInstance();
