import { WebClient } from '@slack/web-api';

import GithubSingleton, { PullRequest } from './github';

const slackClient = new WebClient(GithubSingleton.getInputs().slackBotToken);

export const clearReactions = async (
  slackMessageId: string,
  channelId: string
) => {
  try {
    const existingReactions = await slackClient.reactions.get({
      channel: channelId,
      timestamp: slackMessageId,
    });

    if (
      existingReactions.type === 'message' &&
      existingReactions.message?.reactions
    ) {
      for (const reaction of existingReactions.message.reactions) {
        await slackClient.reactions.remove({
          channel: channelId,
          timestamp: slackMessageId,
          name: reaction.name!,
        });
      }
    }

    return;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const threadComment = async ({ ts, text }) => {
  const message = await slackClient.chat.postMessage({
    channel: GithubSingleton.getInputs().slackChannelId,
    thread_ts: ts,
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

  if (!message.ok || !message.ts) {
    throw Error('Failed to post message to thread requesting re-review');
  }
};

export const newPullRequestMessage = async () => {
  const pullRequest = GithubSingleton.getPullRequest();
  const message = await slackClient.chat.postMessage({
    channel: GithubSingleton.getInputs().slackChannelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hi ${pullRequest.reviewers} :wave:`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<${pullRequest.href}|${pullRequest.title}>* pull request was just published and needs yor review.`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: pullRequest.body,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Please take some time to review the changes and provide your feedback. Your insights and suggestions are greatly appreciated.',
        },
      },
    ],
  });

  if (!message.ok || !message.ts) {
    throw Error('Failed to post message to slack.');
  }
};
