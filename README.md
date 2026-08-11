# Shipped

A React single-page application (TypeScript + Vite), deployed to AWS S3 +
CloudFront.

## Prerequisites

- [Node.js](https://nodejs.org/) 24 (see `.nvmrc` — `nvm use` will pick it up)
- npm 11+ (bundled with Node 24)

## Setup

```bash
nvm use          # or otherwise ensure Node 24
make setup       # install dependencies + git hooks
cp .env.example .env.local   # then edit values as needed
```

## Development

```bash
make run         # start the Vite dev server (http://localhost:5173)
```

## Quality gates

```bash
make format      # auto-format with Prettier
make lint        # oxlint
make typecheck   # tsc project references (strict)
make test        # run the Vitest suite once
make test-cov    # run tests with coverage (fails below 80%)
make build       # production build into dist/
```

Git hooks (via Husky) run `lint-staged` on commit and validate the commit
message against Conventional Commits. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Testing

Tests live under `tests/`, mirroring `src/`, and run on Vitest with
`@testing-library/react` (jsdom). Coverage must stay at or above **80%** —
thresholds are enforced in `vite.config.ts` and in CI. Shared fixtures live in
`tests/fixtures/`.

## Deployment

Every push to `main` is a release candidate, versioned `MAJOR.MINOR.BUILD`
(semver with the patch position as a build number). Via
`.github/workflows/release.yml`:

1. Runs the full CI pipeline (lint, typecheck, test, build) — one artifact.
2. Tags the build `vMAJOR.MINOR.BUILD`: `MAJOR.MINOR` from `package.json`'s
   `version` (bump it deliberately for feature/breaking releases), build
   number from the workflow run number, so every build is uniquely versioned.
3. Deploys the exact `dist` artifact that pipeline built and tested — the
   deploy job downloads it and `aws s3 sync`s it to the target bucket; it
   never rebuilds (build once, deploy everywhere). Future environments become
   additional deploy jobs promoting the same artifact.
4. Creates a CloudFront invalidation so the new build is served immediately.

The tag marks the build; deployment is decided separately — the deploy job
uses the `production` GitHub Environment and requires manual approval. AWS
access uses OIDC (no long-lived keys) via an IAM role defined in
[`infra/`](infra/README.md).

Repo secrets:

| Secret                       | Purpose                               | Status                    |
| ---------------------------- | ------------------------------------- | ------------------------- |
| `AWS_ROLE_ARN`               | IAM role assumed via GitHub OIDC      | ✅ set                    |
| `AWS_REGION`                 | AWS region of the bucket/distribution | ✅ set (`us-east-1`)      |
| `S3_BUCKET`                  | Target S3 bucket name                 | ✅ set (`shipped-web-…`)  |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution to invalidate | ✅ set (`E2YBKNUP3U5WN5`) |

To cut a release: merge to `main`, then approve the pending `production`
deployment in the Actions run.

## Infrastructure

AWS infrastructure is managed with CDK in [`infra/`](infra/README.md). Both the
GitHub OIDC deploy role and the S3 + CloudFront hosting stack are deployed. The
SPA is served from CloudFront distribution `E2YBKNUP3U5WN5`
(`d3d1a5i58tzvg4.cloudfront.net`).

## License

[MIT](LICENSE)
