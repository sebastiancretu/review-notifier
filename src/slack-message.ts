import Client from './client';
import GithubService from './github-service';
import { createUsersToString } from './utils/user-mapping';

export class SlackMessage {
  public static async clearReactions() {
    const slackMessageId = await GithubService.extractSlackTs();
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
          if (reaction.name) {
            await Client.getSlackClient().reactions.remove({
              channel: Client.getInputs().slackChannelId,
              timestamp: slackMessageId,
              name: reaction.name,
            });
          }
        }
      }

      return;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public static async addComment({ text }) {
    const slackMessageId = await GithubService.extractSlackTs();
    const message = await Client.getSlackClient().chat.postMessage({
      channel: Client.getInputs().slackChannelId,
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

    if (!message.ok || !message.ts) {
      throw Error('Failed to post message to thread');
    }
  }

  public static async newPullRequest() {
    const { reviewers, href, title, body, usersMapping } =
      await GithubService.getPullRequest();
    const slackReviewers = createUsersToString({
      users: reviewers,
      s3UsersMapping: usersMapping,
    });
    const message = await Client.getSlackClient().chat.postMessage({
      channel: Client.getInputs().slackChannelId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hi ${slackReviewers} :wave:`,
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

    return message.ts;
  }
}
