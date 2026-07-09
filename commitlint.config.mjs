/**
 * Enforces Conventional Commits (feat/fix/chore/docs/refactor/test/...).
 * Used by the commit-msg hook locally and by the CI lint job.
 */
export default {
  extends: ['@commitlint/config-conventional'],
}
