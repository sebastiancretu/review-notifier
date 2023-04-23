import { context } from '@actions/github';

import Client from './client';
import GithubService from './github-service';
import { SlackMessage } from './slack-message';
import { createUsersToString } from './utils/user-mapping';

// will only run on push to base branch (i.e. staging), so we can assume that a closed state for PR
// equates to 'merged' (no specific event for 'merged' on PRs)

export const onMerge = async (): Promise<void> => {
  try {
    const pullRequest = await GithubService.getPullRequest();

    if (pullRequest.state !== 'closed') {
      throw Error(`PR is not closed for merge: ${pullRequest.number}`);
    }

    const slackMessageId = await GithubService.extractSlackTs();

    await SlackMessage.clearReactions(slackMessageId);

    await Client.getSlackClient().reactions.add({
      channel: Client.getInputs().slackChannelId,
      timestamp: slackMessageId,
      name: 'ship-it',
    });

    await SlackMessage.addComment({
      ts: slackMessageId,
      text: 'This **Pull Request** has been merged.',
    });

    return;
  } catch (error) {
    fail(error);
    throw error;
  }
};

export const onPush = async (): Promise<void> => {
  try {
    const pullRequest = await GithubService.getPullRequest();

    if (pullRequest.state === 'closed' || !pullRequest.reviewersCount) {
      return;
    }
    const slackMessageId = await GithubService.extractSlackTs();

    await SlackMessage.clearReactions(slackMessageId);

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
        (review) => review!.user!.login
      );
      const distinctPreviousReviewers = [...new Set(previousReviewers)];
      const usersToAtString = await createUsersToString({
        users: distinctPreviousReviewers,
        s3UsersMapping: pullRequest.usersMapping,
      });

      await SlackMessage.addComment({
        ts: slackMessageId,
        text: `${usersToAtString} new code has been pushed to the <${pullRequest.href}|Pull Request ${pullRequest.number}> since your last review. It would be great if you could take a look at the latest changes and provide your feedback. Thank you!`,
      });
    }

    return;
  } catch (error) {
    fail(error);
    throw error;
  }
};

export const onPullRequestReview = async (): Promise<void> => {
  try {
    const { action, review } = context.payload;
    const pullRequest = await GithubService.getPullRequest();

    // TODO handle more than just submitted PRs
    if (action !== 'submitted') {
      return;
    }

    if (!pullRequest) {
      throw Error('No pullRequest found');
    }

    const slackMessageId = await GithubService.extractSlackTs();

    //
    // ─── MAP USERS ───────────────────────────────────────────────────
    //

    const [reviewer] = pullRequest.usersMapping.filter((user) => {
      return user.github_username === review.user.login;
    });
    const [author] = pullRequest.usersMapping.filter((user) => {
      return user.github_username === pullRequest.author;
    });

    if (!reviewer) {
      throw Error(
        `Could not map ${review.user.login} to the users you provided in action.yml`
      );
    }

    if (!author) {
      throw Error(
        `Could not map ${pullRequest.author} to the users you provided in action.yml`
      );
    }

    //
    // ─── BUILD MESSAGE ───────────────────────────────────────────────
    //

    const userText = `<@${author.slack_id}>, *${reviewer.github_username}*`;
    let actionText: string = '';
    let reactionToAdd: string = '';

    switch (review.state) {
      case 'changes_requested':
        actionText = 'would like you to change some things in the code';
        reactionToAdd = reactionMap['changes_requested'];
        break;
      // TODO see if getting the review could allow for posting the text that was commented
      // NOTE for reviews where the state is "commented", the comment text is not in the event payload
      case 'commented':
        actionText = 'neither approved or denied your PR, but merely commented';
        reactionToAdd = reactionMap['commented'];
        break;
      case 'approved':
        actionText = 'approved your PR';
        reactionToAdd = reactionMap['approved'];
        break;
    }
    if (!!review.body) {
      actionText = `${actionText}\n>${review.body}`;
    }
    const text = `${userText} ${actionText}`;
    // post corresponding message
    await slackWebClient.chat.postMessage({
      channel: channelId,
      thread_ts: slackMessageId,
      text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text,
          },
        },
      ],
    });

    //
    // ─── ADD REACTION TO MAIN THREAD ─────────────────────────────────
    //

    // get existing reactions on message
    const existingReactionsRes = await slackWebClient.reactions.get({
      channel: channelId,
      timestamp: slackMessageId,
    });

    let hasReaction = false;
    if (existingReactionsRes?.message?.reactions) {
      // return out if the reaction we would add is already present (since we cant have the bot react on behalf of a user)
      existingReactionsRes.message.reactions.forEach((reaction) => {
        if (reaction.name === reactionToAdd) {
          hasReaction = true;
        }
      });
    }

    if (hasReaction) {
      logger.info('END handlePullRequestReview: hasReaction');
      return;
    }

    // add new reactions
    await slackWebClient.reactions.add({
      channel: channelId,
      timestamp: slackMessageId,
      name: reactionToAdd,
    });

    logger.info('END handlePullRequestReview: new reactions added');
    return;
  } catch (error) {
    fail(error);
    throw error;
  }
};
