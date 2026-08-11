# Shipped — Infrastructure (CDK)

AWS CDK (TypeScript) app defining the infrastructure for the Shipped SPA.
Region: **us-east-1** (CloudFront requires its ACM certificate there).

Account-specific identifiers are **not committed** — this repo is public.
Everything resolves at synth time from the environment or CDK context; see
[Resolving values](#resolving-values) for where each real value comes from.

## Stacks

| Stack                | Purpose                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `Shipped-GithubOidc` | IAM role GitHub Actions assumes via OIDC to deploy the SPA. No long-lived keys. |
| `Shipped-Hosting`    | Private S3 bucket + CloudFront (OAC, SPA routing) that serves the built app.    |

Hosting resources:

- **Bucket:** `shipped-web-<account-id>` — derived from the resolved account,
  since bucket names are globally unique.
- **Distribution:** created by `Shipped-Hosting`; its id and domain name are
  stack outputs.
- **Custom domain:** `shipped.beekley.dev` (CloudFront alias + ACM cert in
  us-east-1). The `beekley.dev` hosted zone lives in a different account,
  managed by the Infra-DNS-CDK repo: the `shipped` CNAME and the cert's DNS
  validation CNAME are both added there. Deploying a cert change pauses until
  the validation record lands in that zone.

The release workflow reads `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`, and
`CLOUDFRONT_DISTRIBUTION_ID` from repo secrets.

Shared names/config live in [`lib/config.ts`](lib/config.ts).

## Resolving values

| Value                 | How it resolves                                                               | Where the real one comes from                          |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Account id            | `CDK_DEPLOY_ACCOUNT`, else `CDK_DEFAULT_ACCOUNT` (from active credentials)    | `aws sts get-caller-identity --query Account`          |
| Deploy bucket         | derived: `shipped-web-<account-id>`                                           | `Shipped-Hosting` output `BucketName`                  |
| Distribution id       | `-c distributionId=<id>`, else `CDK_DISTRIBUTION_ID`, else `*` with a warning | `Shipped-Hosting` output `DistributionId`              |
| Cert validation CNAME | n/a (manual, cross-account)                                                   | `aws acm describe-certificate --certificate-arn <arn>` |

Synth fails with an actionable error if the account cannot be resolved —
there is deliberately no default, so you cannot silently target the wrong
account.

### Distribution id ordering (chicken-and-egg)

`Shipped-Hosting` creates the distribution, but `Shipped-GithubOidc` needs its
id to scope the deploy role's invalidation permission. So:

1. Deploy `Shipped-Hosting` first (the invalidation policy is unscoped
   meanwhile — a synth-time warning says so).
2. Take `DistributionId` from its outputs and pass it back when deploying
   `Shipped-GithubOidc`.

## GitHub OIDC deploy role

`Shipped-GithubOidc` imports the account's existing GitHub OIDC provider and
creates the role `shipped-github-actions-deploy`. Trust is scoped to:

- **repo:** `TCBeekley/Shipped`
- **environment:** `production` (subject `repo:TCBeekley/Shipped:environment:production`)

so only the release workflow's manually-approved deploy job can assume it. It
grants S3 sync to the deploy bucket and CloudFront invalidation.

The role ARN — set as the `AWS_ROLE_ARN` repo secret — is the stack's
`DeployRoleArn` output:

```
arn:aws:iam::<account-id>:role/shipped-github-actions-deploy
```

## Commands

```bash
export AWS_PROFILE=<profile>          # populates CDK_DEFAULT_ACCOUNT

npm run build      # tsc
npm test           # jest (assertions on synthesized templates)
npx cdk synth      # emit CloudFormation
npx cdk diff       # diff against deployed state

# Deploy hosting first, then feed its distribution id back into the role:
npx cdk deploy Shipped-Hosting
npx cdk deploy Shipped-GithubOidc -c distributionId=<distribution-id>
```

Tests need no credentials — they synth against a documentation-only account
id (see [`test/setup-env.ts`](test/setup-env.ts)).

## Notes

- If the CloudFront distribution is ever replaced (new id), update the
  `CLOUDFRONT_DISTRIBUTION_ID` secret and redeploy `Shipped-GithubOidc` with
  the new `-c distributionId=<id>`. Nothing in the repo needs editing.
- The SPA itself is deployed by the app repo's release workflow
  (`.github/workflows/release.yml`) on every push to `main` — the release
  tags the build (`vMAJOR.MINOR.BUILD`) and promotes the CI-built artifact.
  Not from here.
