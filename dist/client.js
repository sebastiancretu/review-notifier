"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const rest_1 = require("@octokit/rest");
const web_api_1 = require("@slack/web-api");
// Implement the Client class and the IClient interface as a singleton
class Client {
    constructor() {
        // Initialize the WebClient and Octokit instances
        this.slackClient = new web_api_1.WebClient(this.getInputs().slackBotToken);
        this.octokit = new rest_1.Octokit({
            auth: this.getInputs().githubToken,
        });
    }
    static getInstance() {
        if (!Client.instance) {
            Client.instance = new Client();
        }
        return Client.instance;
    }
    getSlackClient() {
        return this.slackClient;
    }
    getOctokit() {
        return this.octokit;
    }
    getInputs() {
        return {
            ignoreDraft: core.getBooleanInput('ignore-draft'),
            awsRegion: core.getInput('aws-region', { required: true }),
            awsBucket: core.getInput('aws-s3-bucket', {
                required: true,
            }),
            awsObjectKey: core.getInput('aws-s3-object-key', {
                required: true,
            }),
            slackBotToken: core.getInput('slack-bot-token', {
                required: true,
            }),
            slackChannelId: core.getInput('slack-channel-id', {
                required: true,
            }),
            githubToken: core.getInput('github-token', {
                required: true,
            }),
            extractBodySummary: core.getBooleanInput('extract-body-summary', {
                required: false,
            }) ?? false,
            ignoreLabels: core
                .getInput('ignore-labels', {
                required: false,
            })
                .split(',')
                .map((label) => label.trim()) ?? [],
        };
    }
}
exports.default = Client.getInstance();
