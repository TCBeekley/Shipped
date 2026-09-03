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
    // Pinned to the site's policy by comment: the redirect below adds a second
    // policy, and this assertion is about this one.
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        Comment: 'Security headers for the Shipped SPA',
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
        Comment: 'Security headers for the Shipped SPA',
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

  test('allows script only from this origin, and never inline', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        SecurityHeadersConfig: Match.objectLike({
          ContentSecurityPolicy: {
            ContentSecurityPolicy:
              "default-src 'self'; script-src 'self'; style-src 'self'; " +
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

  test('proxies the Plausible tracker from this domain', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Origins: Match.arrayWith([
          Match.objectLike({ DomainName: 'plausible.io' }),
        ]),
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: '/js/*' }),
        ]),
      }),
    })
  })

  test('lets the event endpoint POST, uncached, with viewer headers', () => {
    // All three matter. POST is how events are sent; a cached response would
    // answer every visitor with the first one's result; and Plausible's docs
    // are explicit that without the visitor's real IP in X-Forwarded-For the
    // bot filter drops the event silently, so viewer headers have to survive
    // the hop. AllViewerExceptHostHeader forwards them while leaving Host for
    // CloudFront to set to the origin.
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        // arrayWith matches in order, so each behaviour is asserted on its own
        // rather than as a sequence that a reorder would break.
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({
            PathPattern: '/api/event',
            AllowedMethods: Match.arrayWith(['POST']),
            // Managed CachingDisabled / AllViewerExceptHostHeader.
            CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
            OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
          }),
        ]),
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

  test('requests one DNS-validated certificate covering the apex and www', () => {
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'beekley.dev',
      SubjectAlternativeNames: ['www.beekley.dev'],
      ValidationMethod: 'DNS',
    })
  })

  test('serves the apex and www from their own distribution', () => {
    // Their own, not extra aliases on the site's: adding names there would
    // replace the live certificate, and the replacement cannot validate until
    // a record lands in a zone this account does not own.
    template.resourceCountIs('AWS::CloudFront::Distribution', 2)

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['beekley.dev', 'www.beekley.dev'],
        ViewerCertificate: Match.objectLike({
          AcmCertificateArn: {
            Ref: Match.stringLikeRegexp('RedirectCertificate'),
          },
        }),
      }),
    })
  })

  test('the site distribution keeps serving only the site domain', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: [config.siteDomain],
      }),
    })
  })

  test('redirects to the canonical host with a 301, path and query kept', () => {
    const code = Object.values(
      template.findResources('AWS::CloudFront::Function'),
    )[0].Properties.FunctionCode as string

    expect(code).toContain(`'https://${config.siteDomain}' + request.uri`)
    expect(code).toContain('statusCode: 301')
    expect(code).toContain("query.join('&')")
  })

  test('runs the redirect on viewer-request, before any origin is hit', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['beekley.dev', 'www.beekley.dev'],
        DefaultCacheBehavior: Match.objectLike({
          FunctionAssociations: [
            Match.objectLike({ EventType: 'viewer-request' }),
          ],
        }),
      }),
    })
  })

  test('leaves includeSubdomains off on the redirect, to spare siblings', () => {
    // This distribution answers for the zone apex, so includeSubdomains would
    // pin seeding, transfer-tracker, and the delegated vpn and stitch zones to
    // HTTPS for two years in any browser that followed the redirect.
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        Comment: 'Security headers for the apex and www redirect',
        SecurityHeadersConfig: Match.objectLike({
          StrictTransportSecurity: {
            AccessControlMaxAgeSec: 63072000,
            IncludeSubdomains: false,
            Preload: false,
            Override: true,
          },
        }),
      }),
    })
  })

  test('outputs the domain the apex and www records point at', () => {
    template.hasOutput('RedirectDistributionDomainName', {})
  })
})
