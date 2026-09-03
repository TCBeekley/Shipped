/**
 * Shared configuration for the Shipped infrastructure.
 *
 * Centralised so the GitHub OIDC deploy role and the hosting stack agree on
 * names (e.g. the deploy bucket) without a cross-stack dependency.
 *
 * Account-specific identifiers are resolved at synth time rather than
 * committed: this repo is public, and hardcoding them would publish the
 * deploy target's identity for no benefit. Everything resolves from the
 * environment or CDK context — see infra/README.md for where each value
 * comes from.
 */

/** Thrown at synth time when a required identifier cannot be resolved. */
function required(value: string | undefined, message: string): string {
  if (!value) throw new Error(message)
  return value
}

/**
 * The AWS account to deploy into. `CDK_DEPLOY_ACCOUNT` is an explicit
 * override; otherwise CDK populates `CDK_DEFAULT_ACCOUNT` from the active
 * credentials/profile. There is deliberately no default — silently synthing
 * against the wrong account is worse than failing loudly.
 */
function resolveAccount(): string {
  return required(
    process.env.CDK_DEPLOY_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT,
    'Cannot resolve the AWS account. Set CDK_DEPLOY_ACCOUNT, or run with ' +
      'credentials so CDK populates CDK_DEFAULT_ACCOUNT ' +
      '(e.g. `AWS_PROFILE=<profile> npx cdk synth`).',
  )
}

export const config = {
  /** AWS account the stacks deploy into (resolved at synth time). */
  get account(): string {
    return resolveAccount()
  },
  /** Region for regional resources (S3). CloudFront itself is global. */
  region: 'us-east-1',

  /** GitHub repository allowed to assume the deploy role, "owner/name". */
  githubOwner: 'TCBeekley',
  githubRepo: 'Shipped',

  /**
   * GitHub Actions OIDC subject permitted to assume the deploy role.
   * The release workflow's deploy job runs in the `production` environment, so
   * its OIDC `sub` claim is `repo:<owner>/<name>:environment:production` —
   * the tightest scope that still matches our pipeline.
   */
  get githubDeploySubject(): string {
    return `repo:${this.githubOwner}/${this.githubRepo}:environment:production`
  },

  /**
   * S3 bucket that hosts the built SPA and is the deploy target. Bucket names
   * are globally unique, so the account id is the suffix that guarantees it —
   * derived here rather than committed.
   */
  get deployBucketName(): string {
    return `shipped-web-${this.account}`
  },

  /**
   * Custom domain the site is served from. The beekley.dev hosted zone lives
   * in a different account, managed by the Infra-DNS-CDK repo — both the
   * `shipped` CNAME and the ACM validation record are added there.
   */
  siteDomain: 'shipped.beekley.dev',

  /**
   * Hostnames that permanently redirect to `siteDomain`. Neither has ever
   * served anything -- the zone carries only subdomains (`seeding`,
   * `shipped`, `transfer-tracker`, and delegations for `vpn` and `stitch`) --
   * so pointing the bare domain at the portfolio costs nothing and stops the
   * obvious guess from failing to resolve.
   *
   * The first entry is the certificate's subject; the rest are SANs. Their
   * records live in the same cross-account zone as `siteDomain`'s.
   */
  redirectDomains: ['beekley.dev', 'www.beekley.dev'],
} as const

/**
 * CloudFront distribution serving the SPA, used only to scope the deploy
 * role's invalidation permission to one distribution instead of all of them.
 *
 * Chicken-and-egg: the Hosting stack creates the distribution, but the
 * GithubOidc stack needs its id to write the policy. Ordering:
 *
 *   1. Deploy Hosting first; take `DistributionId` from its outputs.
 *   2. Pass it back when deploying GithubOidc, via either
 *      `-c distributionId=<id>` or `CDK_DISTRIBUTION_ID=<id>`.
 *
 * Until it is supplied the policy falls back to `*` — scoped to this
 * account's distributions by the ARN, and only assumable by the approved
 * release job — so a first-time bootstrap works. Supply the id on subsequent
 * deploys to tighten it; `hasScopedDistribution` lets tests assert both paths.
 */
export function resolveDistributionId(scope?: {
  node: { tryGetContext(key: string): unknown }
}): { id: string; scoped: boolean } {
  const fromContext = scope?.node.tryGetContext('distributionId')
  const id =
    (typeof fromContext === 'string' ? fromContext : undefined) ??
    process.env.CDK_DISTRIBUTION_ID

  return id ? { id, scoped: true } : { id: '*', scoped: false }
}

/** The account/region env every stack in this app deploys to. */
export const env = {
  get account(): string {
    return config.account
  },
  region: config.region,
}
