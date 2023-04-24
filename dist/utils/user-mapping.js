"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUsersToString = exports.getUsersMapping = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const getUsersMapping = async ({ bucket, key, region, }) => {
    if (!bucket || !key || !region) {
        throw new Error('Missing required inputs for AWS');
    }
    const client = new client_s3_1.S3Client({ region });
    const getObjectCommand = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    const response = await client.send(getObjectCommand);
    if (!response.Body) {
        throw new Error('No response data from S3');
    }
    let responseDataBuffer = Buffer.alloc(0);
    for await (const chunk of response.Body) {
        responseDataBuffer = Buffer.concat([responseDataBuffer, chunk]);
    }
    const responseDataString = responseDataBuffer.toString('utf-8');
    return JSON.parse(responseDataString);
};
exports.getUsersMapping = getUsersMapping;
const createUsersToString = ({ users, s3UsersMapping, }) => {
    const slackIdsConcat = users.map((user) => {
        const { slack_id } = s3UsersMapping.find((config) => config.github_username === user) ?? { slack_id: '' };
        return `<@${slack_id}>`;
    });
    return String(slackIdsConcat);
};
exports.createUsersToString = createUsersToString;
