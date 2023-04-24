import { context } from '@actions/github';

import Client from './client';
import GithubService from './github-service';
import { SlackMessage } from './slack-message';
import { createUsersToString } from './utils/user-mapping';

const reactionMap = {
  approved: 'white_check_mark',
  changes_requested: 'octagonal_sign',
};

export const onMerge = async (): Promise<void> => {
  const pullRequest = await GithubService.getPullRequest();

  if (pullRequest.state !== 'closed') {
    throw Error(`PR is not closed for merge: ${pullRequest.number}`);
  }

  const slackMessageId = await GithubService.extractSlackTs();

  await SlackMessage.clearReactions();

  await Client.getSlackClient().reactions.add({
    channel: Client.getInputs().slackChannelId,
    timestamp: slackMessageId,
    name: 'ship-it',
  });

  await SlackMessage.addComment({
    text: 'This **Pull Request** has been merged.',
  });
};

export const onPush = async (): Promise<void> => {
  const pullRequest = await GithubService.getPullRequest();

  if (pullRequest.state === 'closed' || !pullRequest.reviewersCount) {
    return;
  }

  await SlackMessage.clearReactions();

  if (pullRequest.state === 'closed' || !pullRequest.reviewersCount) {
    return;
  }

  const reviews = await Client.getOctokit().rest.pulls.listReviews({
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    pull_number: pullRequest.number,
  });

  if (reviews.data) {
    const previousReviewers = reviews.data.map(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (review) => review!.user!.login
    );

    const usersToAtString = await createUsersToString({
      users: [...new Set(previousReviewers)],
      s3UsersMapping: pullRequest.usersMapping,
    });

    await SlackMessage.addComment({
      text: `${usersToAtString} new code has been pushed to the <${pullRequest.href}|Pull Request ${pullRequest.number}> since your last review. It would be great if you could take a look at the latest changes and provide your feedback. Thank you!`,
    });
  }
};

export const onPullRequestReview = async (): Promise<void> => {
  const { action, review } = context.payload;

  if (
    (action && !['submitted', 'edited'].includes(action)) ||
    !reactionMap[review.state]
  ) {
    return;
  }

  const pullRequest = await GithubService.getPullRequest();

  if (!pullRequest) {
    throw Error('No pullRequest found');
  }

  const reviewer = pullRequest.usersMapping.find(
    (user) => user.github_username === review.user.login
  );

  if (!reviewer) {
    throw Error(
      `Could not map ${review.user.login} to the users you provided in action.yml`
    );
  }

  const author = pullRequest.usersMapping.find(
    (user) => user.github_username === pullRequest.author
  );

  if (!author) {
    throw Error(
      `Could not map ${pullRequest.author} to the users you provided in action.yml`
    );
  }

  const slackMessageId = await GithubService.extractSlackTs();
  const formattedText = `<@${author.slack_id}>, *${reviewer.github_username}*`;

  const existingReactionsRes = await Client.getSlackClient().reactions.get({
    channel: Client.getInputs().slackChannelId,
    timestamp: slackMessageId,
  });

  const hasReaction = existingReactionsRes?.message?.reactions?.some(
    (reaction) => reaction.name === reactionMap[review.state]
  );

  if (!hasReaction) {
    await Client.getSlackClient().reactions.add({
      channel: Client.getInputs().slackChannelId,
      timestamp: slackMessageId,
      name: reactionMap[review.state],
    });
  }

  const slackMessageText =
    review.state === 'changes_requested'
      ? `${formattedText} has **requested changes**. Please review.`
      : `${formattedText} **approved** your Pull Request.`;

  await SlackMessage.addComment({
    text: slackMessageText,
  });
};
