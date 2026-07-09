/**
 * Enforces Conventional Commits (feat/fix/chore/docs/refactor/test/...).
 * Used by the commit-msg hook locally and by the CI lint job.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Dependabot (and humans pasting URLs/changelogs) routinely exceed the
    // default 100-char body/footer line limit. The limit is stylistic, not part
    // of conventional-commit correctness, so we disable it.
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
}
