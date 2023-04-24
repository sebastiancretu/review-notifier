import * as core from '@actions/core';
import { context } from '@actions/github';
import slackifyMarkdown from 'slackify-markdown';

import Client from './client';
import { trimToWords } from './utils/string';
import { GithubSlackMapping, getUsersMapping } from './utils/user-mapping';

export interface PullRequest {
  readonly author: string;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly number: number;
  readonly owner: string;
  readonly repo: string;
  readonly reviewersCount: number;
  readonly reviewers: string[];
  readonly labels: string[];
  readonly action: string;
  readonly state: string;
  readonly ref: string;
  readonly eventName: string;
  readonly usersMapping: GithubSlackMapping[];
}

class GithubService {
  private static instance: GithubService;
  private pullRequest: PullRequest | null = null;

  private slackMessageId: string | undefined;

  private constructor() {
    this.getPullRequest().then(() => this.extractSlackTs());
  }

  static getInstance(): GithubService {
    if (!GithubService.instance) {
      GithubService.instance = new GithubService();
    }
    return GithubService.instance;
  }

  async extractSlackTs(): Promise<string | undefined> {
    if (!this.pullRequest) {
      throw Error('No pull_request');
    }

    if (this.slackMessageId) {
      return this.slackMessageId;
    }

    const comments = await Client.getOctokit().rest.issues.listComments({
      owner: this.pullRequest.owner,
      repo: this.pullRequest.repo,
      issue_number: this.pullRequest.number,
    });

    const slackTs = comments.data
      .map((comment) =>
        comment.body?.match(/SLACK_MESSAGE_ID:[0-9]{1,}.[0-9]{1,}/)
      )
      .find((match) => match)?.[0];

    this.slackMessageId = slackTs;

    return this.slackMessageId;
  }

  async addSlackTsComment(ts: string) {
    if (!this.pullRequest || !this.pullRequest.reviewersCount) {
      return;
    }

    return await Client.getOctokit().rest.issues.createComment({
      owner: this.pullRequest.owner,
      repo: this.pullRequest.repo,
      issue_number: this.pullRequest.number,
      body: `SLACK_MESSAGE_ID:${ts}`,
    });
  }

  async getPullRequest(): Promise<PullRequest> {
    if (this.pullRequest) {
      return this.pullRequest;
    }

    let pullRequest;

    if (context.payload?.pull_request) {
      pullRequest = context.payload.pull_request;
    } else if (context.payload?.issue) {
      const { data } = await Client.getOctokit().rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.payload.issue.number,
      });
      pullRequest = data;
    } else {
      throw new Error('Missing pull request information in the payload');
    }

    const { awsBucket, awsObjectKey, awsRegion } = Client.getInputs();

    const usersMapping = await getUsersMapping({
      bucket: awsBucket,
      key: awsObjectKey,
      region: awsRegion,
    });

    console.log(JSON.stringify(context));
    this.pullRequest = {
      author: pullRequest.user?.login ?? 'unknown',
      title: pullRequest.title,
      body: trimToWords(
        slackifyMarkdown(pullRequest.body ?? ''),
        Number(Client.getInputs().maxBodyWordCount)
      ),
      href: pullRequest?.html_url,
      number: Number(pullRequest?.number),
      owner: context.repo.owner,
      repo: context.repo.repo,
      reviewersCount: pullRequest.requested_reviewers?.length ?? 0,
      reviewers:
        pullRequest.requested_reviewers?.map((user) => user.login) ?? [],
      labels: pullRequest.labels.map((label) => label.name),
      action: pullRequest.merged
        ? 'merged'
        : pullRequest.draft
        ? 'draft'
        : pullRequest.action,
      state: pullRequest.state,
      ref: context.ref,
      eventName: context.eventName,
      usersMapping: usersMapping.engineers,
    };

    return this.pullRequest;
  }
  isActionOnBaseBranch(): boolean {
    let baseRef: string | undefined;
    let headRef: string | undefined;

    switch (context.eventName) {
      case 'pull_request':
        baseRef = context.payload.pull_request?.base?.ref;
        headRef = context.payload.pull_request?.head?.ref;
        break;
      case 'push':
        baseRef = context.payload.ref?.replace('refs/heads/', '');
        headRef = context.payload.before?.slice(0, 7);
        break;
      default:
        core.warning(`Unsupported event type: ${context.eventName}`);
        return false;
    }

    if (headRef && baseRef && headRef === baseRef) {
      core.info(`Action is on base branch (${baseRef})`);
      return true;
    } else {
      core.info(`Action is not on base branch (${baseRef})`);
      return false;
    }
  }
}

export default GithubService.getInstance();
