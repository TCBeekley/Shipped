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
- **Apex redirect:** `beekley.dev` and `www.beekley.dev` 301 to the site, via a
  second distribution with its own certificate and a CloudFront Function that
  answers on viewer-request. See [Apex and www redirect](#apex-and-www-redirect).

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

## Apex and www redirect

`beekley.dev` and `www.beekley.dev` permanently redirect to
`shipped.beekley.dev`, preserving path and query string.

It is a **second** distribution (`RedirectDistribution`) rather than two more
aliases on the site's, and that is the whole design decision. Adding names to
the site's distribution replaces its certificate, and the replacement cannot
validate until a record lands in a zone this account does not own — so the
distribution that serves the live site would sit mid-update for the length of a
cross-repo, cross-account round trip. As a separate distribution the change is
additive: `cdk diff` touches nothing that serves the site.

The redirect's origin is never contacted — the viewer-request function returns
a 301 before CloudFront consults the cache or origin. It points at the
canonical host anyway, so that detaching the function degrades to serving the
site rather than to an error.

Its response headers policy is the site's minus `includeSubdomains` on HSTS.
That distribution answers for the **zone apex**, so the flag would pin every
sibling — `seeding`, `transfer-tracker`, and the delegated `vpn` and `stitch`
zones, in accounts this stack knows nothing about — to HTTPS for two years in
any browser that followed the redirect.

### Bringing it up

Both certificate validation and the public records live in the Infra-DNS-CDK
repo's `beekley.dev` zone, so this is a three-step handoff:

1. `npx cdk deploy Shipped-Hosting`. It pauses creating `RedirectCertificate`,
   waiting on validation for both names.
2. Read the two validation CNAMEs and add them to the `beekley.dev` zone:

   ```bash
   aws acm describe-certificate --certificate-arn <arn> \
     --query 'Certificate.DomainValidationOptions[].ResourceRecord'
   ```

   Deploy Infra-DNS-CDK. The certificate validates and step 1 completes.

3. Point the names at the redirect distribution, using the stack's
   `RedirectDistributionDomainName` output. In the `beekley.dev` zone:

   | Record            | Type       | Value                                   |
   | ----------------- | ---------- | --------------------------------------- |
   | `beekley.dev`     | A alias    | the redirect distribution's domain name |
   | `beekley.dev`     | AAAA alias | the redirect distribution's domain name |
   | `www.beekley.dev` | CNAME      | the redirect distribution's domain name |

   The apex cannot be a CNAME, so it needs Route 53 **alias** records — target
   hosted zone `Z2FDTNDATAQYW2`, CloudFront's fixed zone id. AAAA as well as A
   because CloudFront distributions answer on IPv6 by default. `www` is an
   ordinary CNAME, matching the other records in that zone.

Order matters in step 3: the records must land _after_ the certificate
validates, or the distribution will answer for names it does not yet hold and
CloudFront will serve an error instead of the redirect.

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

npm run build      # tsc type check (output goes to dist/, unused at runtime)
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
