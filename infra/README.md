# Shipped — Infrastructure (CDK)

AWS CDK (TypeScript) app defining the infrastructure for the Shipped SPA.

Target account: **702895206239** · region: **us-east-1**.

## Stacks

| Stack                | Status       | Purpose                                                                         |
| -------------------- | ------------ | ------------------------------------------------------------------------------- |
| `Shipped-GithubOidc` | **deployed** | IAM role GitHub Actions assumes via OIDC to deploy the SPA. No long-lived keys. |
| `Shipped-Hosting`    | **deployed** | Private S3 bucket + CloudFront (OAC, SPA routing) that serves the built app.     |

Deployed hosting resources:

- **Bucket:** `shipped-web-702895206239`
- **Distribution:** `E2YBKNUP3U5WN5` → `d3d1a5i58tzvg4.cloudfront.net`

All four release secrets (`AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`,
`CLOUDFRONT_DISTRIBUTION_ID`) are set. The OIDC role's CloudFront permission is
scoped to distribution `E2YBKNUP3U5WN5`.

Shared names/config live in [`lib/config.ts`](lib/config.ts).

## GitHub OIDC deploy role

`Shipped-GithubOidc` imports the account's existing GitHub OIDC provider and
creates the role `shipped-github-actions-deploy`. Trust is scoped to:

- **repo:** `TCBeekley/Shipped`
- **environment:** `production` (subject `repo:TCBeekley/Shipped:environment:production`)

so only the release workflow's manually-approved deploy job can assume it. It
grants S3 sync to the deploy bucket and CloudFront invalidation.

Role ARN (already set as the `AWS_ROLE_ARN` repo secret):

```
arn:aws:iam::702895206239:role/shipped-github-actions-deploy
```

## Commands

```bash
export AWS_PROFILE=Timothy-Beekley

npm run build      # tsc
npm test           # jest (assertions on synthesized templates)
npx cdk synth      # emit CloudFormation (no AWS creds needed)
npx cdk diff       # diff against deployed state
npx cdk deploy Shipped-GithubOidc   # deploy a specific stack
```

## Notes

- If the CloudFront distribution is ever replaced (new ID), update
  `distributionId` in [`lib/config.ts`](lib/config.ts) and redeploy both the
  `CLOUDFRONT_DISTRIBUTION_ID` secret and `Shipped-GithubOidc`.
- The SPA itself is deployed by the app repo's release workflow
  (`.github/workflows/release.yml`) on `v*.*.*` tags — not from here.
