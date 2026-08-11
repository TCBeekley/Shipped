# Security policy

This repository hosts a static portfolio site
([shipped.beekley.dev](https://shipped.beekley.dev)) and the AWS CDK
infrastructure that serves it. It handles no user data, has no backend, and
stores no credentials.

## Reporting a vulnerability

Please report suspected vulnerabilities privately rather than opening a public
issue:

- **Preferred:** [open a private security advisory](https://github.com/TCBeekley/Shipped/security/advisories/new)
- **Email:** tim@beekley.engineering

Include what you found, how to reproduce it, and the impact you expect. As a
personal project this has no formal SLA, but expect an acknowledgement within
about a week.

## Scope

In scope: this repository's application code, CDK infrastructure definitions,
GitHub Actions workflows, and the deployed site.

Out of scope: findings that require compromising GitHub or AWS themselves,
missing hardening with no demonstrable impact, and automated scanner output
without a working proof of concept.

## How this project is secured

- **No long-lived cloud credentials.** Deploys assume an AWS role through
  GitHub OIDC, with trust scoped to this repository _and_ its manually
  approved `production` environment.
- **Least-privilege IAM.** The deploy role can write only the site bucket and
  invalidate only the site's CloudFront distribution.
- **Private origin.** The S3 bucket blocks all public access and is reachable
  only through CloudFront Origin Access Control, over TLS.
- **Security headers.** CloudFront serves HSTS, a restrictive
  Content-Security-Policy, `nosniff`, `X-Frame-Options: DENY`, a strict
  referrer policy, and a deny-by-default `Permissions-Policy`.
- **Scanned continuously.** CodeQL (per PR and weekly), dependency review on
  pull requests, npm advisory checks on both lockfiles, and Dependabot
  updates. Every GitHub Action is pinned to a commit SHA.
