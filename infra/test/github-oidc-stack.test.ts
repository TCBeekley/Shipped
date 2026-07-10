import * as cdk from 'aws-cdk-lib'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { GithubOidcStack } from '../lib/github-oidc-stack'
import { env, config } from '../lib/config'

describe('GithubOidcStack', () => {
  const app = new cdk.App()
  const stack = new GithubOidcStack(app, 'Test-GithubOidc', { env })
  const template = Template.fromStack(stack)

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
