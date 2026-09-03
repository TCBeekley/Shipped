module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Jest's default order puts 'js' first, so a stale compiled lib/*.js left over
  // from `npm run build` would shadow the .ts source it was built from and tests
  // would silently validate the old code. Resolving .ts first is the same
  // guarantee `--prefer-ts-exts` gives the CDK app in cdk.json.
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'mjs',
    'cjs',
    'jsx',
    'json',
    'node',
  ],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
}
