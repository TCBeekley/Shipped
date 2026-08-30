import * as cdk from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import { Construct } from 'constructs'
import { config } from './config'

/**
 * S3 + CloudFront hosting for the Shipped SPA, served at
 * `config.siteDomain`. The bucket name matches `config.deployBucketName` so
 * the GitHub OIDC deploy role (in GithubOidcStack) already grants access to
 * it; the stack outputs feed the release workflow secrets (S3_BUCKET,
 * CLOUDFRONT_DISTRIBUTION_ID).
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

    // The beekley.dev zone lives in another account (Infra-DNS-CDK repo), so
    // validation cannot be automated from here: deploying pauses in
    // CREATE_IN_PROGRESS until the validation CNAME (from the ACM console or
    // `aws acm describe-certificate`) is added to that zone.
    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: config.siteDomain,
      validation: acm.CertificateValidation.fromDns(),
    })

    // CSP is tuned to what `npm run build` actually emits: one external
    // module script, one external stylesheet, no inline script or style.
    // `data:` is required for img-src because Vite inlines small SVG assets
    // (the CPAP card icon) as data URIs. Nothing is fetched cross-origin, so
    // default-src stays 'self'. Re-check this string if the build ever gains
    // inline styles, web fonts, or an analytics beacon.
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; ')

    const responseHeaders = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeaders',
      {
        comment: 'Security headers for the Shipped SPA',
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy,
            override: true,
          },
          contentTypeOptions: { override: true }, // nosniff
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(730),
            includeSubdomains: true,
            // Preload deliberately off: the beekley.dev zone is managed in a
            // different account, and preload submission is hard to reverse.
            preload: false,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Permissions-Policy',
              value: [
                'accelerometer=()',
                'camera=()',
                'geolocation=()',
                'gyroscope=()',
                'magnetometer=()',
                'microphone=()',
                'payment=()',
                'usb=()',
              ].join(', '),
              override: true,
            },
          ],
        },
      },
    )

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: [config.siteDomain],
      certificate,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: responseHeaders,
      },
      /*
       * There is no client-side router: the home page is prerendered and each
       * case study is its own document. The old rule answered every unmatched
       * path with 200 and the home page, which meant a broken internal link
       * looked like a working one -- two shipped that way -- and every scanner
       * probing for /wp-login.php was served a full page and billed as a hit.
       *
       * Both statuses are mapped because the bucket is private behind OAC:
       * with no s3:ListBucket grant, S3 answers a missing key with 403 rather
       * than 404, so 403 is the common case and 404 the rarer one.
       */
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
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
