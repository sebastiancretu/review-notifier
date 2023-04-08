import core from '@actions/core';
import github from '@actions/github';
import slackifyMarkdown from 'slackify-markdown';

interface Inputs {
  readonly ignoreDraft: boolean;
  readonly awsRegion: string;
  readonly awsBucket: string;
  readonly awsObjectKey: string;
  readonly baseBranch: string;
  readonly slackBotToken: string;
  readonly slackChannelId: string;
  readonly githubToken: string;
}

interface PullRequest {
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
}

class GithubSingleton {
  private static instance: GithubSingleton;
  private readonly pullRequest;
  private readonly repository;
  private readonly context;

  private constructor() {
    this.context = github.context;
    this.repository = this.context.payload;
    this.pullRequest = this.repository.pull_request || {};
  }

  static getInstance(): GithubSingleton {
    if (!GithubSingleton.instance) {
      GithubSingleton.instance = new GithubSingleton();
    }
    return GithubSingleton.instance;
  }

  public getInputs(): Inputs {
    return {
      ignoreDraft: core.getBooleanInput('ignore-draft'),
      awsRegion: core.getInput('aws-region', { required: true }),
      awsBucket: core.getInput('aws-s3-bucket', {
        required: true,
      }),
      awsObjectKey: core.getInput('aws-s3-object-key', {
        required: true,
      }),
      baseBranch: core.getInput('base-branch', {
        required: true,
      }),
      slackBotToken: core.getInput('slack-bot-token', {
        required: true,
      }),
      slackChannelId: core.getInput('slack-channel-id', {
        required: true,
      }),
      githubToken: core.getInput('github-token', {
        required: true,
      }),
    };
  }

  public getPullRequest(): PullRequest {
    return {
      author: this.pullRequest.user?.login,
      title: this.pullRequest.title,
      body: slackifyMarkdown(this.pullRequest?.body) ?? '',
      href: this.pullRequest?.html_url,
      number: Number(this.pullRequest?.number),
      owner: this.repository.owner.login,
      repo: this.repository.name,
      reviewersCount: this.pullRequest.requested_reviewers.length,
      reviewers: this.pullRequest.requested_reviewers
        ? this.pullRequest.map((user) => user.login)
        : [],
      labels: this.pullRequest.labels,
      action: this.pullRequest?.merged
        ? 'merged'
        : this.pullRequest?.draft
        ? 'draft'
        : this.repository.action,
      state: this.pullRequest?.state,
      ref: this.context.ref,
      eventName: this.context.eventName,
    };
  }
}

export default GithubSingleton.getInstance();
