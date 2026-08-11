// Stacks resolve the deploy account from the environment at synth time
// (see lib/config.ts). Tests synth against a documentation-only account id
// so no real identifier is needed — or committed — to run them.
process.env.CDK_DEPLOY_ACCOUNT ??= '123456789012'
