import * as github from "@actions/github";
import * as core from "@actions/core";
import { createInitialMessage } from "./actions/createInitialMessage";
import { handleLabelChange } from "./actions/handleLabelChange";
import { getSlackMessageId } from "./utils/getSlackMessageId";
import { handleMerge } from "./actions/handleMerge";
import { handleCommitPush } from "./actions/handleCommitPush";
import { handlePullRequestReview } from "./actions/handlePullRequestReview";

async function run(): Promise<void> {
  const { eventName, payload, ref } = github.context;
  const baseBranch = core.getInput("base-branch");
  const isActingOnBaseBranch = ref.includes(baseBranch);

  let hasQuietLabel = false;
  let isWip = false;

  const pullRequest = payload.pull_request;
  const ignoreDraft = core.getInput("ignore-draft-prs");
  const quietLabel = core.getInput("quiet-label");

  if (pullRequest) {
    hasQuietLabel = pullRequest.labels.some((label) => label.name === quietLabel);
    isWip = pullRequest.draft && ignoreDraft;
  }

  if (isWip || hasQuietLabel) return;

  if (eventName === "pull_request") {
    if (["opened", "ready_for_review"].includes(payload.action)) {
      console.log("running createInitialMessage::: ", payload);
      await createInitialMessage();
      return;
    }

    if (["labeled", "unlabeled"].includes(payload.action)) {
      console.log("running handleLabelChange::: ", payload);
      await handleLabelChange();
      return;
    }
  }

  const slackMessageId = await getSlackMessageId();
  if (!slackMessageId) {
    await createInitialMessage();
    return;
  }

  if (eventName === "push") {
    if (isActingOnBaseBranch) {
      console.log("running handleMerge::: ", payload);
      await handleMerge();
      return;
    }

    console.log("running handleCommitPush::: ", payload);
    await handleCommitPush();
    return;
  }

  if (eventName === "pull_request_review") {
    console.log("running handlePullRequestReview::: ", payload);
    await handlePullRequestReview();
    return;
  }
}

run();
