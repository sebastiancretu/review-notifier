import { WebClient } from '@slack/web-api';

import GithubSingleton from './github';

const slackClient = new WebClient(GithubSingleton.getInputs().slackBotToken);

export const slackClearReactions = async (
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

export const slackThreadComment = async ({ ts, text }) => {
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
