"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPullRequestReview = exports.onPush = exports.onMerge = void 0;
const github_1 = require("@actions/github");
const client_1 = __importDefault(require("./client"));
const github_service_1 = __importDefault(require("./github-service"));
const slack_message_1 = require("./slack-message");
const user_mapping_1 = require("./utils/user-mapping");
const reactionMap = {
    approved: 'white_check_mark',
    changes_requested: 'octagonal_sign',
};
const onMerge = async () => {
    const pullRequest = await github_service_1.default.getPullRequest();
    if (pullRequest.state !== 'closed') {
        throw Error(`PR is not closed for merge: ${pullRequest.number}`);
    }
    const slackMessageId = await github_service_1.default.extractSlackTs();
    await slack_message_1.SlackMessage.clearReactions();
    await client_1.default.getSlackClient().reactions.add({
        channel: client_1.default.getInputs().slackChannelId,
        timestamp: slackMessageId,
        name: 'ship-it',
    });
    await slack_message_1.SlackMessage.addComment({
        text: 'This **Pull Request** has been merged.',
    });
};
exports.onMerge = onMerge;
const onPush = async () => {
    const pullRequest = await github_service_1.default.getPullRequest();
    if (pullRequest.state === 'closed' || !pullRequest.reviewersCount) {
        return;
    }
    await slack_message_1.SlackMessage.clearReactions();
    if (pullRequest.state === 'closed' || !pullRequest.reviewersCount) {
        return;
    }
    const reviews = await client_1.default.getOctokit().rest.pulls.listReviews({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        pull_number: pullRequest.number,
    });
    if (reviews.data) {
        const previousReviewers = reviews.data.map(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (review) => review.user.login);
        const usersToAtString = await (0, user_mapping_1.createUsersToString)({
            users: [...new Set(previousReviewers)],
            s3UsersMapping: pullRequest.usersMapping,
        });
        await slack_message_1.SlackMessage.addComment({
            text: `${usersToAtString} new code has been pushed to the <${pullRequest.href}|Pull Request ${pullRequest.number}> since your last review. It would be great if you could take a look at the latest changes and provide your feedback. Thank you!`,
        });
    }
};
exports.onPush = onPush;
const onPullRequestReview = async () => {
    const { action, review } = github_1.context.payload;
    if (action && !['submitted', 'edited'].includes(action)) {
        return;
    }
    const pullRequest = await github_service_1.default.getPullRequest();
    if (!pullRequest) {
        throw Error('No pullRequest found');
    }
    const reviewer = pullRequest.usersMapping.find((user) => user.github_username === review.user.login);
    if (!reviewer) {
        throw Error(`Could not map ${review.user.login} to the users you provided in action.yml`);
    }
    const author = pullRequest.usersMapping.find((user) => user.github_username === pullRequest.author);
    if (!author) {
        throw Error(`Could not map ${pullRequest.author} to the users you provided in action.yml`);
    }
    const slackMessageId = await github_service_1.default.extractSlackTs();
    const formattedText = `<@${author.slack_id}>, *${reviewer.github_username}*`;
    const existingReactionsRes = await client_1.default.getSlackClient().reactions.get({
        channel: client_1.default.getInputs().slackChannelId,
        timestamp: slackMessageId,
    });
    const hasReaction = existingReactionsRes?.message?.reactions?.some((reaction) => reaction.name === reactionMap[review.state]);
    if (!hasReaction) {
        await client_1.default.getSlackClient().reactions.add({
            channel: client_1.default.getInputs().slackChannelId,
            timestamp: slackMessageId,
            name: reactionMap[review.state],
        });
    }
    const slackMessageText = review.state === 'changes_requested'
        ? `${formattedText} has **requested changes**. Please review.`
        : `${formattedText} **approved** your Pull Request.`;
    await slack_message_1.SlackMessage.addComment({
        text: slackMessageText,
    });
};
exports.onPullRequestReview = onPullRequestReview;
