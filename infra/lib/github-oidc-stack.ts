import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { config, resolveDistributionId } from './config'

/**
 * IAM role assumed by GitHub Actions (via the account's existing GitHub OIDC
 * provider) to deploy the Shipped SPA to S3 + CloudFront. No long-lived keys.
 *
 * Trust is scoped to a single repo AND the `production` environment, so only
 * the release workflow's manually-approved deploy job can assume it.
 */
export class GithubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // The OIDC provider already exists in this account (other repos use it),
    // so we import it rather than creating a duplicate.
    const providerArn = `arn:aws:iam::${config.account}:oidc-provider/token.actions.githubusercontent.com`
    const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GithubOidcProvider',
      providerArn,
    )

    const principal = new iam.OpenIdConnectPrincipal(provider, {
      StringEquals: {
        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        'token.actions.githubusercontent.com:sub': config.githubDeploySubject,
      },
    })

    const role = new iam.Role(this, 'DeployRole', {
      roleName: 'shipped-github-actions-deploy',
      assumedBy: principal,
      description: `GitHub Actions deploy role for ${config.githubOwner}/${config.githubRepo} (production env)`,
      maxSessionDuration: cdk.Duration.hours(1),
    })

    const bucketArn = `arn:aws:s3:::${config.deployBucketName}`

    // List the bucket (needed by `aws s3 sync --delete`).
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ListDeployBucket',
        actions: ['s3:ListBucket'],
        resources: [bucketArn],
      }),
    )

    // Read/write/delete objects while syncing the built SPA.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'WriteDeployObjects',
        actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        resources: [`${bucketArn}/*`],
      }),
    )

    // Invalidate CloudFront so a new deploy is served immediately. Scoped to
    // the single distribution that serves the SPA (from the Hosting stack) —
    // see resolveDistributionId for the two-step ordering when bootstrapping.
    const distribution = resolveDistributionId(this)
    if (!distribution.scoped) {
      cdk.Annotations.of(this).addWarningV2(
        'ShippedDeployRole:UnscopedInvalidation',
        'No distributionId supplied — CloudFront invalidation is not scoped ' +
          'to a single distribution. Pass -c distributionId=<id> (or set ' +
          'CDK_DISTRIBUTION_ID) once the Hosting stack has been deployed.',
      )
    }
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'InvalidateCloudFront',
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
        ],
        resources: [
          `arn:aws:cloudfront::${config.account}:distribution/${distribution.id}`,
        ],
      }),
    )

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: role.roleArn,
      description: 'Set this as the AWS_ROLE_ARN GitHub Actions secret',
      exportName: 'ShippedDeployRoleArn',
    })
  }
}
