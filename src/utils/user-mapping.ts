import { Readable } from 'stream';

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export interface GithubSlackMapping {
  github_username: string;
  slack_id: string;
}

interface UsersMapping {
  engineers: GithubSlackMapping[];
}

export const getUsersMapping = async ({
  bucket,
  key,
  region,
}: {
  bucket: string;
  key: string;
  region: string;
}): Promise<UsersMapping> => {
  if (!bucket || !key || !region) {
    throw new Error('Missing required inputs for AWS');
  }

  const client = new S3Client({ region });
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(getObjectCommand);

  if (!response.Body) {
    throw new Error('No response data from S3');
  }

  let responseDataBuffer = Buffer.alloc(0);

  for await (const chunk of response.Body as Readable) {
    responseDataBuffer = Buffer.concat([responseDataBuffer, chunk]);
  }

  const responseDataString = responseDataBuffer.toString('utf-8');

  return JSON.parse(responseDataString) as UsersMapping;
};

export const createUsersToString = ({
  users,
  s3UsersMapping,
}: {
  users: string[];
  s3UsersMapping: GithubSlackMapping[];
}): string => {
  const slackIdsConcat = users.map((user) => {
    const { slack_id } = s3UsersMapping.find(
      (config) => config.github_username === user
    ) ?? { slack_id: '' };
    return `<@${slack_id}>`;
  });

  return String(slackIdsConcat);
};
