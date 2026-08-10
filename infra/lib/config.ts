/**
 * Shared configuration for the Shipped infrastructure.
 *
 * Centralised so the GitHub OIDC deploy role and the hosting stack agree on
 * names (e.g. the deploy bucket) without a cross-stack dependency.
 */
export const config = {
  /** AWS account the stacks deploy into. */
  account: '702895206239',
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

  /** S3 bucket that hosts the built SPA and is the deploy target. */
  deployBucketName: 'shipped-web-702895206239',

  /**
   * Custom domain the site is served from. The beekley.dev hosted zone lives
   * in a different account, managed by the Infra-DNS-CDK repo — both the
   * `shipped` CNAME and the ACM validation record are added there.
   */
  siteDomain: 'shipped.beekley.dev',

  /**
   * CloudFront distribution serving the SPA (output of the Hosting stack).
   * Used to scope the deploy role's invalidation permission to just this
   * distribution rather than all distributions in the account.
   */
  distributionId: 'E2YBKNUP3U5WN5',
} as const

/** The account/region env every stack in this app deploys to. */
export const env = {
  account: config.account,
  region: config.region,
}
