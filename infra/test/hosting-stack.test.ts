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

  test('attaches a response headers policy to the default behavior', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ResponseHeadersPolicyId: {
            Ref: Match.stringLikeRegexp('SecurityHeaders'),
          },
        }),
      }),
    })
  })

  test('sets HSTS for two years, subdomains included, preload off', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        SecurityHeadersConfig: Match.objectLike({
          StrictTransportSecurity: {
            AccessControlMaxAgeSec: 63072000,
            IncludeSubdomains: true,
            Preload: false,
            Override: true,
          },
        }),
      }),
    })
  })

  test('sets nosniff, DENY framing, and a strict referrer policy', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        SecurityHeadersConfig: Match.objectLike({
          ContentTypeOptions: { Override: true },
          FrameOptions: { FrameOption: 'DENY', Override: true },
          ReferrerPolicy: {
            ReferrerPolicy: 'strict-origin-when-cross-origin',
            Override: true,
          },
        }),
      }),
    })
  })

  test('forbids script outright and keeps everything else same-origin', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        SecurityHeadersConfig: Match.objectLike({
          ContentSecurityPolicy: {
            ContentSecurityPolicy:
              "default-src 'self'; script-src 'none'; style-src 'self'; " +
              "img-src 'self'; object-src 'none'; base-uri 'self'; " +
              "form-action 'none'; frame-ancestors 'none'",
            Override: true,
          },
        }),
      }),
    })
  })

  test('denies sensitive browser features via Permissions-Policy', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        CustomHeadersConfig: {
          Items: Match.arrayWith([
            Match.objectLike({
              Header: 'Permissions-Policy',
              Value: Match.stringLikeRegexp('camera=\\(\\)'),
              Override: true,
            }),
          ]),
        },
      }),
    })
  })

  test('answers an unmatched path with 404.html and a real 404', () => {
    // The status is the point. Answering 200 made broken internal links
    // indistinguishable from working ones, and two of them shipped that way.
    // 403 is mapped as well as 404: behind OAC with no s3:ListBucket grant,
    // S3 reports a missing key as 403.
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: [
          Match.objectLike({
            ErrorCode: 403,
            ResponseCode: 404,
            ResponsePagePath: '/404.html',
          }),
          Match.objectLike({
            ErrorCode: 404,
            ResponseCode: 404,
            ResponsePagePath: '/404.html',
          }),
        ],
      }),
    })
  })
})
