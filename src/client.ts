import { Octokit } from '@octokit/rest';
import { WebClient } from '@slack/web-api';

import GithubSingleton from './github';

class Client {
  private static instance: Client;
  private slackClient: WebClient;
  private octokit: Octokit;

  private constructor() {
    // Initialize the WebClient and Octokit instances
    this.slackClient = new WebClient(GithubSingleton.getInputs().slackBotToken);
    this.octokit = new Octokit({
      auth: GithubSingleton.getInputs().githubToken,
    });
  }

  public static getInstance(): Client {
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
}

export default Client;
