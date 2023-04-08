module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    (message) =>
      /^Bumps \[.+]\(.+\) from .+ to .+\.$/m.test(message) ||
      /^Release (\d+\.)?(\d+\.)?(\*|\d+) \[skip ci\]$/m.test(message),
  ],
  rules: {},
};
