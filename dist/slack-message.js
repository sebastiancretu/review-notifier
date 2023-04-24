"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackMessage = void 0;
const client_1 = __importDefault(require("./client"));
const github_service_1 = __importDefault(require("./github-service"));
class SlackMessage {
    static async clearReactions() {
        const slackMessageId = await github_service_1.default.extractSlackTs();
        if (!slackMessageId) {
            return;
        }
        try {
            const existingReactions = await client_1.default.getSlackClient().reactions.get({
                channel: client_1.default.getInputs().slackChannelId,
                timestamp: slackMessageId,
            });
            if (existingReactions.type === 'message' &&
                existingReactions.message?.reactions) {
                for (const reaction of existingReactions.message.reactions) {
                    if (reaction.name) {
                        await client_1.default.getSlackClient().reactions.remove({
                            channel: client_1.default.getInputs().slackChannelId,
                            timestamp: slackMessageId,
                            name: reaction.name,
                        });
                    }
                }
            }
            return;
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
    static async addComment({ text }) {
        const slackMessageId = await github_service_1.default.extractSlackTs();
        const message = await client_1.default.getSlackClient().chat.postMessage({
            channel: client_1.default.getInputs().slackChannelId,
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
    static async newPullRequest() {
        const { reviewers, href, title, body } = await github_service_1.default.getPullRequest();
        const message = await client_1.default.getSlackClient().chat.postMessage({
            channel: client_1.default.getInputs().slackChannelId,
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
        return message.ts;
    }
}
exports.SlackMessage = SlackMessage;
