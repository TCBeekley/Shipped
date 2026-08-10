import * as cdk from 'aws-cdk-lib'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { HostingStack } from '../lib/hosting-stack'
import { env, config } from '../lib/config'

describe('HostingStack', () => {
  const app = new cdk.App()
  const stack = new HostingStack(app, 'Test-Hosting', { env })
  const template = Template.fromStack(stack)

  test('creates a private site bucket with the configured deploy name', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: config.deployBucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    })
  })

  test('requests a DNS-validated certificate for the site domain', () => {
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: config.siteDomain,
      ValidationMethod: 'DNS',
    })
  })

  test('serves the site domain as a CloudFront alias with the certificate', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: [config.siteDomain],
        ViewerCertificate: Match.objectLike({
          AcmCertificateArn: {
            Ref: Match.stringLikeRegexp('SiteCertificate'),
          },
          SslSupportMethod: 'sni-only',
        }),
      }),
    })
  })

  test('rewrites 403/404 to index.html for SPA routing', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: [
          Match.objectLike({ ErrorCode: 403, ResponseCode: 200 }),
          Match.objectLike({ ErrorCode: 404, ResponseCode: 200 }),
        ],
      }),
    })
  })
})
