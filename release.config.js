module.exports = {
  branches: ['main'],
  repositoryUrl: 'https://github.com/sebastiancretu/review-notifier',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        parserOpts: {
          noteKeywords: [
            'BREAKING CHANGE',
            'BREAKING CHANGES',
            'BREAKING',
            'BREAKING CHANGE:',
          ],
        },
        preset: 'conventionalcommits',
        releaseRules: [
          {
            breaking: true,
            release: 'major',
          },
          {
            release: 'minor',
            type: 'feat',
          },
          {
            release: 'patch',
            type: 'fix',
          },
          {
            release: 'patch',
            type: 'docs',
          },
          {
            release: 'patch',
            type: 'style',
          },
          {
            release: 'patch',
            type: 'refactor',
          },
          {
            release: 'patch',
            type: 'perf',
          },
          {
            release: 'patch',
            type: 'test',
          },
          {
            release: 'minor',
            type: 'build',
          },
          {
            release: 'patch',
            type: 'ci',
          },
          {
            release: 'minor',
            type: 'revert',
          },
        ],
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
        },
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            {
              section: 'Features',
              type: 'feat',
            },
            {
              section: 'Bug Fixes',
              type: 'fix',
            },
            {
              section: 'Documentation',
              type: 'docs',
            },
            {
              section: 'Styling',
              type: 'style',
            },
            {
              section: 'Refactors',
              type: 'refactor',
            },
            {
              section: 'Performance',
              type: 'perf',
            },
            {
              section: 'Tests',
              type: 'test',
            },
            {
              section: 'Build System',
              type: 'build',
            },
            {
              section: 'CI',
              type: 'ci',
            },
            {
              section: 'Reverts',
              type: 'revert',
            },
          ],
        },
        writerOpts: {
          commitGroupsSort: 'title',
          commitsSort: ['subject', 'scope'],
        },
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepare: 'npm run package',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: [
          'CHANGELOG.md',
          'README.md',
          'package.json',
          'yarn.lock',
          'dist',
        ],
        message: 'Release <%= nextRelease.version %> [skip ci]',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          'CHANGELOG.md',
          'README.md',
          'package.json',
          'package-lock.json',
          'dist',
        ],
      },
    ],
  ],
};
