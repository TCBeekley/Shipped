# Shipped

A React single-page application (TypeScript + Vite), deployed to AWS S3 +
CloudFront.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 (see `.nvmrc` — `nvm use` will pick it up)
- npm 10+ (bundled with Node 20)

## Setup

```bash
nvm use          # or otherwise ensure Node 20
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

Deploys run on version tags (`vX.Y.Z`) via `.github/workflows/release.yml`:

1. Runs the full CI pipeline.
2. Builds the SPA and `aws s3 sync`s `dist/` to the target bucket.
3. Creates a CloudFront invalidation so the new build is served immediately.

The deploy job uses the `production` GitHub Environment and requires manual
approval. AWS access uses OIDC (no long-lived keys) via an IAM role defined in
[`infra/`](infra/README.md).

Repo secrets:

| Secret                       | Purpose                               | Status                     |
| ---------------------------- | ------------------------------------- | -------------------------- |
| `AWS_ROLE_ARN`               | IAM role assumed via GitHub OIDC      | ✅ set                     |
| `AWS_REGION`                 | AWS region of the bucket/distribution | ✅ set (`us-east-1`)       |
| `S3_BUCKET`                  | Target S3 bucket name                 | ⏳ after `Shipped-Hosting` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution to invalidate | ⏳ after `Shipped-Hosting` |

To cut a release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Infrastructure

AWS infrastructure is managed with CDK in [`infra/`](infra/README.md). The
GitHub OIDC deploy role is already deployed; the S3 + CloudFront hosting stack
is scaffolded there and can be deployed when ready.

## License

[MIT](LICENSE)
