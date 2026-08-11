import * as cdk from 'aws-cdk-lib'
import { Template, Match, Annotations } from 'aws-cdk-lib/assertions'
import { GithubOidcStack } from '../lib/github-oidc-stack'
import { env, config } from '../lib/config'

describe('GithubOidcStack', () => {
  const app = new cdk.App()
  const stack = new GithubOidcStack(app, 'Test-GithubOidc', { env })
  const template = Template.fromStack(stack)

  test('derives the deploy bucket name from the resolved account', () => {
    expect(config.deployBucketName).toBe(`shipped-web-${config.account}`)
    expect(config.deployBucketName).not.toMatch(/shipped-web-$/)
  })

  test('creates exactly one deploy role', () => {
    template.resourceCountIs('AWS::IAM::Role', 1)
  })

  test('trusts the GitHub OIDC provider scoped to repo + production env', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'shipped-github-actions-deploy',
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub':
                  config.githubDeploySubject,
              },
            },
          }),
        ]),
      },
    })
  })

  test('grants scoped S3 and CloudFront deploy permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'WriteDeployObjects',
            Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: `arn:aws:s3:::${config.deployBucketName}/*`,
          }),
          Match.objectLike({
            Sid: 'InvalidateCloudFront',
            Action: [
              'cloudfront:CreateInvalidation',
              'cloudfront:GetInvalidation',
            ],
          }),
        ]),
      },
    })
  })
})

describe('GithubOidcStack distribution scoping', () => {
  test('scopes invalidation to the distribution supplied via context', () => {
    const app = new cdk.App({ context: { distributionId: 'EXAMPLE12345' } })
    const stack = new GithubOidcStack(app, 'Scoped-GithubOidc', { env })

    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'InvalidateCloudFront',
            Resource: `arn:aws:cloudfront::${config.account}:distribution/EXAMPLE12345`,
          }),
        ]),
      },
    })
  })

  test('falls back to account-wide distributions and warns when unsupplied', () => {
    const app = new cdk.App()
    const stack = new GithubOidcStack(app, 'Unscoped-GithubOidc', { env })

    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'InvalidateCloudFront',
            Resource: `arn:aws:cloudfront::${config.account}:distribution/*`,
          }),
        ]),
      },
    })
    expect(
      Annotations.fromStack(stack).findWarning(
        '*',
        Match.stringLikeRegexp('No distributionId supplied'),
      ),
    ).toHaveLength(1)
  })
})
