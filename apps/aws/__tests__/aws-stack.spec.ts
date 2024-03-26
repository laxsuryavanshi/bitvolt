import * as cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { BitvoltStack } from '../lib/aws-stack'

const AWS_COGNITO_USER_POOL = 'AWS::Cognito::UserPool'
const AWS_COGNITO_USER_POOL_CLIENT = 'AWS::Cognito::UserPoolClient'
const AWS_COGNITO_IDENTITY_POOL = 'AWS::Cognito::IdentityPool'
const AWS_COGNITO_IDENTITY_POOL_ROLE_ATTACHMENT = 'AWS::Cognito::IdentityPoolRoleAttachment'
const AWS_IAM_ROLE = 'AWS::IAM::Role'
const AWS_S3_BUCKET = 'AWS::S3::Bucket'

describe('BitvoltStack', () => {
  let app: cdk.App
  let stack: BitvoltStack
  let template: Template

  beforeAll(() => {
    app = new cdk.App()
    stack = new BitvoltStack(app, 'BitvoltStack')
    template = Template.fromStack(stack)
  })

  it('should throw error on multiple instance creation', () => {
    expect(() => new BitvoltStack(app, 'BitvoltStack')).toThrow()
    expect(stack).toStrictEqual(BitvoltStack.instance)
  })

  it('should create correct number of resources', () => {
    template.resourceCountIs(AWS_COGNITO_USER_POOL, 1)
    template.resourceCountIs(AWS_COGNITO_USER_POOL_CLIENT, 1)
    template.resourceCountIs(AWS_COGNITO_IDENTITY_POOL, 1)
    template.resourceCountIs(AWS_COGNITO_IDENTITY_POOL_ROLE_ATTACHMENT, 1)
    // additional role is created for a lambda function created to handle
    // `autoDeleteObjects` setting on S3 bucket
    template.resourceCountIs(AWS_IAM_ROLE, 3)
    template.resourceCountIs(AWS_S3_BUCKET, 1)
  })

  describe('AWS::Cognito::UserPool', () => {
    it('should set email as username attribute', () => {
      template.hasResourceProperties(AWS_COGNITO_USER_POOL, {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
        Schema: [
          {
            Mutable: true,
            Name: 'email',
            Required: true,
          },
        ],
      })
    })

    it('should not allow user sign up', () => {
      template.hasResourceProperties(AWS_COGNITO_USER_POOL, {
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
      })
    })

    it('should allow account recovery from admin only', () => {
      template.hasResourceProperties(AWS_COGNITO_USER_POOL, {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'admin_only',
              Priority: 1,
            },
          ],
        },
      })
    })

    it('should set deletion policy to destroy on user pool', () => {
      template.hasResource(AWS_COGNITO_USER_POOL, {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      })
    })
  })

  describe('AWS::Cognito::UserPoolClient', () => {
    it('should prevent user existence errors', () => {
      template.hasResourceProperties(AWS_COGNITO_USER_POOL_CLIENT, {
        PreventUserExistenceErrors: 'ENABLED',
      })
    })

    it('should enable SRP and Custom auth flows', () => {
      template.hasResourceProperties(AWS_COGNITO_USER_POOL_CLIENT, {
        ExplicitAuthFlows: ['ALLOW_CUSTOM_AUTH', 'ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
      })
    })

    it('should create a default client with cognito provider', () => {
      template.hasResourceProperties(AWS_COGNITO_USER_POOL_CLIENT, {
        SupportedIdentityProviders: ['COGNITO'],
      })
    })
  })

  describe('AWS::Cognito::IdentityPool', () => {
    it('should not allow unauthenticated identities to the identity pool', () => {
      template.hasResourceProperties(AWS_COGNITO_IDENTITY_POOL, {
        AllowUnauthenticatedIdentities: false,
      })
    })
  })

  describe('AWS::S3::Bucket', () => {
    it('should enable cors', () => {
      template.hasResourceProperties(AWS_S3_BUCKET, {
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['DELETE', 'GET', 'HEAD', 'POST', 'PUT'],
              AllowedOrigins: ['*'],
              ExposedHeaders: [
                'x-amz-server-side-encryption',
                'x-amz-request-id',
                'x-amz-id-2',
                'ETag',
              ],
              MaxAge: 3000,
            },
          ],
        },
      })
    })
  })
})
