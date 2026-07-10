# Shipped — Infrastructure (CDK)

AWS CDK (TypeScript) app defining the infrastructure for the Shipped SPA.

Target account: **702895206239** · region: **us-east-1**.

## Stacks

| Stack                | Status                  | Purpose                                                                         |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `Shipped-GithubOidc` | **deployed**            | IAM role GitHub Actions assumes via OIDC to deploy the SPA. No long-lived keys. |
| `Shipped-Hosting`    | scaffold (not deployed) | Private S3 bucket + CloudFront (OAC, SPA routing) that serves the built app.     |

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

## Deploying hosting later

When you're ready to provision hosting:

```bash
npx cdk deploy Shipped-Hosting
```

Then finish wiring the release workflow secrets from the stack outputs:

- `S3_BUCKET` → `shipped-web-702895206239` (bucket name)
- `CLOUDFRONT_DISTRIBUTION_ID` → `Shipped-Hosting.DistributionId` output

and **tighten** the OIDC role's CloudFront permission in
[`lib/github-oidc-stack.ts`](lib/github-oidc-stack.ts) from `distribution/*` to
the specific distribution ARN, then redeploy `Shipped-GithubOidc`.
