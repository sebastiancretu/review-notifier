import * as core from '@actions/core';
import { context } from '@actions/github';

import Client from './client';

async function run(): Promise<void> {
  const { eventName, payload, ref } = context;
  const baseBranch = core.getInput('base-branch');
  const isActingOnBaseBranch = ref.includes(baseBranch);

  let hasQuietLabel = false;
  let isWip = false;

  const pullRequest = payload.pull_request;
  const ignoreDraft = Client.getInputs().ignoreDraft;
  const ignoreLabels = Client.getInputs().ignoreLabels;

  if (pullRequest) {
    hasQuietLabel = pullRequest.labels.some((label) =>
      ignoreLabels.includes(label.name)
    );
    isWip = pullRequest.draft && ignoreDraft;
  }

  if (isWip || hasQuietLabel) return;

  if (eventName === 'pull_request') {
    if (['opened', 'ready_for_review'].includes(payload.action)) {
      console.log('running createInitialMessage::: ', payload);
      await createInitialMessage();
      return;
    }

    if (['labeled', 'unlabeled'].includes(payload.action)) {
      console.log('running handleLabelChange::: ', payload);
      await handleLabelChange();
      return;
    }
  }

  const slackMessageId = await getSlackMessageId();
  if (!slackMessageId) {
    await createInitialMessage();
    return;
  }

  if (eventName === 'push') {
    if (isActingOnBaseBranch) {
      console.log('running handleMerge::: ', payload);
      await handleMerge();
      return;
    }

    console.log('running handleCommitPush::: ', payload);
    await handleCommitPush();
    return;
  }

  if (eventName === 'pull_request_review') {
    console.log('running handlePullRequestReview::: ', payload);
    await handlePullRequestReview();
    return;
  }
}

run();
