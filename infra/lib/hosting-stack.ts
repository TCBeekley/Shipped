import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import { Construct } from 'constructs'
import { config } from './config'

/**
 * S3 + CloudFront hosting for the Shipped SPA.
 *
 * SCAFFOLD — written for future use but not yet deployed. The bucket name
 * matches `config.deployBucketName` so the GitHub OIDC deploy role (in
 * GithubOidcStack) already grants access to it. Deploy this when you're ready
 * to provision hosting, then wire the outputs into the release workflow
 * secrets (S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID).
 */
export class HostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Private bucket — CloudFront reaches it via Origin Access Control only.
    const bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: config.deployBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Static, rebuildable content — safe to tear down and redeploy.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      // SPA client-side routing: serve index.html for unknown paths.
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    })

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'Set this as the S3_BUCKET GitHub Actions secret',
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description:
        'Set this as the CLOUDFRONT_DISTRIBUTION_ID GitHub Actions secret',
    })

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront domain serving the SPA',
    })
  }
}
