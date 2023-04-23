import core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { WebClient } from '@slack/web-api';

interface Inputs {
  readonly ignoreDraft: boolean;
  readonly awsRegion: string;
  readonly awsBucket: string;
  readonly awsObjectKey: string;
  readonly baseBranch: string;
  readonly slackBotToken: string;
  readonly slackChannelId: string;
  readonly githubToken: string;

  readonly numOfWords: string | number;

  readonly ignoreLabels: string[];
}

interface IClient {
  getSlackClient(): WebClient;
  getOctokit(): Octokit;
  getInputs(): Inputs;
}

// Implement the Client class and the IClient interface as a singleton
class Client implements IClient {
  private static instance: IClient;
  private slackClient: WebClient;
  private octokit: Octokit;

  private constructor() {
    // Initialize the WebClient and Octokit instances
    this.slackClient = new WebClient(this.getInputs().slackBotToken);
    this.octokit = new Octokit({
      auth: this.getInputs().githubToken,
    });
  }

  public static getInstance(): IClient {
    if (!Client.instance) {
      Client.instance = new Client();
    }

    return Client.instance;
  }

  public getSlackClient(): WebClient {
    return this.slackClient;
  }

  public getOctokit(): Octokit {
    return this.octokit;
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
      numOfWords:
        core.getInput('slack-message-max-words-count', {
          required: false,
        }) ?? 250,
      ignoreLabels:
        core
          .getInput('ignore-labels', {
            required: false,
          })
          .split(',')
          .map((label) => label.trim()) ?? [],
    };
  }
}

export default Client.getInstance();
