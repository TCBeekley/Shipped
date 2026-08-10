#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { GithubOidcStack } from '../lib/github-oidc-stack'
import { HostingStack } from '../lib/hosting-stack'
import { env } from '../lib/config'

const app = new cdk.App()

// The GitHub Actions OIDC deploy role. Deployed now.
new GithubOidcStack(app, 'Shipped-GithubOidc', {
  env,
  description: 'GitHub Actions OIDC deploy role for the Shipped SPA',
})

// S3 + CloudFront hosting.
new HostingStack(app, 'Shipped-Hosting', {
  env,
  description: 'S3 + CloudFront hosting for the Shipped SPA',
})
