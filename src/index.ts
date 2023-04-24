import { context } from '@actions/github';

import Client from './client';
import GithubService from './github-service';
import { onMerge, onPullRequestReview, onPush } from './handlers';
import { SlackMessage } from './slack-message';

async function run(): Promise<void> {
  const { eventName } = context;

  const pullRequest = await GithubService.getPullRequest();
  const slackMessageId = await GithubService.extractSlackTs();
  const ignoreDraft = Client.getInputs().ignoreDraft;
  const ignoreLabels = Client.getInputs().ignoreLabels;

  const hasQuietLabel = pullRequest.labels.some((label) =>
    ignoreLabels.includes(label)
  );

  const isWip = pullRequest.action === 'draft' && ignoreDraft;

  if (isWip || hasQuietLabel) {
    return;
  }

  if (!slackMessageId) {
    const sentNewPullRequestMessage = await SlackMessage.newPullRequest();
    await GithubService.addSlackTsComment(sentNewPullRequestMessage);
  }

  switch (eventName) {
    case 'pull_request_review':
      await onPullRequestReview();
      break;

    case 'push':
      if (GithubService.isActionOnBaseBranch()) {
        await onMerge();
      } else {
        await onPush();
      }
      break;

    default:
      break;
  }
}

run();
