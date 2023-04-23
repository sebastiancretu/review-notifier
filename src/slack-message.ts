import Client from './client';

export class SlackMessage {
  public static async clearReactions(slackMessageId: string | undefined) {
    if (!slackMessageId) {
      return;
    }

    try {
      const existingReactions = await Client.getSlackClient().reactions.get({
        channel: Client.getInputs().slackChannelId,
        timestamp: slackMessageId,
      });

      if (
        existingReactions.type === 'message' &&
        existingReactions.message?.reactions
      ) {
        for (const reaction of existingReactions.message.reactions) {
          await Client.getSlackClient().reactions.remove({
            channel: Client.getInputs().slackChannelId,
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
  }

  public static async addComment({ ts, text }) {
    const message = await Client.getSlackClient().chat.postMessage({
      channel: Client.getInputs().slackChannelId,
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
  }

  public static async newPullRequest({
    channelId,
    reviewers,
    href,
    title,
    body,
  }) {
    const message = await Client.getSlackClient().chat.postMessage({
      channel: channelId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hi ${reviewers} :wave:`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*<${href}|${title}>* pull request was just published and needs yor review.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: body,
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
  }
}
