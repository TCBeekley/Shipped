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
 *
 * A second, redirect-only distribution answers for `config.redirectDomains`
 * (the apex and www) with a 301 to the canonical host -- see the "Apex and www
 * redirect" section of infra/README.md for why it is separate.
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

    // CSP is tuned to what `npm run build` actually emits, re-checked against
    // dist/ rather than assumed: external stylesheets only, no inline style,
    // no inline or external script, and no data: URIs anywhere in the markup
    // or the CSS. The home page is prerendered and every case study is hand
    // written HTML, so 'none' for script-src is a description of the build
    // rather than an aspiration -- and it is what makes the zero-JavaScript
    // claim enforceable at the edge instead of merely true today.
    //
    // Re-check this string if the build ever gains inline styles, web fonts,
    // an analytics beacon, or a data: URI (Vite inlines assets under
    // build.assetsInlineLimit, so a small enough new image would need
    // `data:` restored to img-src).
    const contentSecurityPolicy = [
      "default-src 'self'",
      /*
       * 'self', not 'none': the Plausible tracker is served from /js/ on this
       * domain. Still no host other than this one, and still no
       * 'unsafe-inline', so an injected inline script is refused. Events POST
       * to /api/event, which default-src 'self' already covers.
       */
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self'",
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

    // Upstream for the proxied analytics behaviours below.
    const plausible = new origins.HttpOrigin('plausible.io')

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
      /*
       * Plausible, proxied through this domain rather than loaded from
       * plausible.io, matching how seeding.beekley.engineering does it. Both
       * halves become same-origin, which keeps the CSP at script-src 'self'
       * with no third-party host allowed, and leaves nothing for a content
       * blocker to match on a filter list.
       */
      additionalBehaviors: {
        // The tracker script. Cacheable and identical for every visitor.
        '/js/*': {
          origin: plausible,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        /*
         * The event endpoint. Three things here are load-bearing:
         *
         *  - POST must be allowed, so ALLOW_ALL rather than the default
         *    GET/HEAD. Events are POSTed.
         *  - Caching must be off. A cached event response would mean one
         *    visitor's request answering everyone else's.
         *  - Viewer headers must reach Plausible. ALL_VIEWER_EXCEPT_HOST_HEADER
         *    forwards User-Agent (device and browser attribution) while letting
         *    CloudFront set Host to the origin, which ALL_VIEWER would not.
         *
         * Plausible's proxy docs are explicit that the visitor's real IP has to
         * arrive in X-Forwarded-For, and that a missing or wrong value means
         * "Plausible's bot filter will drop the event silently" -- no error,
         * just no data. CloudFront populates that header with the viewer IP
         * when forwarding to a custom origin, which is what makes this work.
         */
        '/api/event': {
          origin: plausible,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    })

    /*
     * beekley.dev and www.beekley.dev, permanently redirected to the canonical
     * host.
     *
     * Deliberately a second distribution rather than two more aliases on the
     * one above. Adding names to that distribution means replacing its
     * certificate, and the replacement cannot validate until a record lands in
     * a zone this account does not own -- so the live site's distribution would
     * sit mid-update for however long that cross-repo, cross-account round trip
     * took. Everything below is additive instead: `cdk diff` for this change
     * touches nothing that serves the site.
     */
    const [redirectPrimaryDomain, ...redirectAlternateDomains] =
      config.redirectDomains

    const redirectCertificate = new acm.Certificate(
      this,
      'RedirectCertificate',
      {
        domainName: redirectPrimaryDomain,
        subjectAlternativeNames: [...redirectAlternateDomains],
        // Same cross-account story as SiteCertificate above: deploying pauses
        // until both validation CNAMEs are added to the beekley.dev zone.
        validation: acm.CertificateValidation.fromDns(),
      },
    )

    const redirectFunction = new cloudfront.Function(this, 'RedirectFunction', {
      comment: `301 the apex and www to ${config.siteDomain}`,
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request
  var location = 'https://${config.siteDomain}' + request.uri
  var query = []

  /*
   * Path and query are carried across so a link that picks up a campaign tag
   * or a deep path still lands where it meant to. Duplicated parameters
   * collapse into a single field whose multiValue array repeats the first
   * value, so multiValue is the complete list whenever it is present.
   * Emitting "name=value" unconditionally round-trips an empty value
   * ("?ref=") instead of dropping the "=".
   */
  for (var name in request.querystring) {
    var parameter = request.querystring[name]
    var values = parameter.multiValue || [parameter]
    for (var i = 0; i < values.length; i++) {
      query.push(name + '=' + values[i].value)
    }
  }

  if (query.length > 0) {
    location = location + '?' + query.join('&')
  }

  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  }
}
`),
    })

    const redirectHeaders = new cloudfront.ResponseHeadersPolicy(
      this,
      'RedirectSecurityHeaders',
      {
        comment: 'Security headers for the apex and www redirect',
        securityHeadersBehavior: {
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
            /*
             * The one place this policy deliberately differs from the site's:
             * includeSubdomains is off here. This distribution answers for the
             * zone apex, so the flag would pin every sibling -- seeding,
             * transfer-tracker, and the delegated vpn and stitch zones, which
             * live in accounts this stack knows nothing about -- to HTTPS for
             * two years in any browser that had followed the redirect. Pinning
             * beekley.dev itself is the whole intent and costs nothing; pinning
             * the rest of the zone as a side effect of a redirect is not this
             * change's call to make.
             */
            includeSubdomains: false,
            preload: false,
            override: true,
          },
        },
      },
    )

    const redirectDistribution = new cloudfront.Distribution(
      this,
      'RedirectDistribution',
      {
        comment: `Redirects the apex and www to ${config.siteDomain}`,
        domainNames: [...config.redirectDomains],
        certificate: redirectCertificate,
        defaultBehavior: {
          /*
           * Never contacted: the viewer-request function answers before
           * CloudFront consults the cache or the origin. A distribution still
           * requires one, so it points at the canonical host -- if the function
           * were ever detached, the fallback is the site rather than an error.
           */
          origin: new origins.HttpOrigin(config.siteDomain),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          responseHeadersPolicy: redirectHeaders,
          functionAssociations: [
            {
              function: redirectFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      },
    )

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

    new cdk.CfnOutput(this, 'RedirectDistributionDomainName', {
      value: redirectDistribution.distributionDomainName,
      description:
        'CloudFront domain the apex A/AAAA alias and the www CNAME point at, ' +
        'in the beekley.dev zone (Infra-DNS-CDK)',
    })
  }
}
