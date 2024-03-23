import * as cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { BitvoltStack } from '../lib/aws-stack'

const AWS_COGNIT_USER_POOL = 'AWS::Cognito::UserPool'
const AWS_COGNIT_USER_POOL_CLIENT = 'AWS::Cognito::UserPoolClient'

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

  describe(AWS_COGNIT_USER_POOL, () => {
    it('should create a user pool', () => {
      template.resourceCountIs(AWS_COGNIT_USER_POOL, 1)
    })

    it('should set email as username attribute', () => {
      template.hasResourceProperties(AWS_COGNIT_USER_POOL, {
        UsernameAttributes: ['email'],
      })
    })

    it('should not allow user sign up', () => {
      template.hasResourceProperties(AWS_COGNIT_USER_POOL, {
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
      })
    })

    it('should allow account recovery from admin only', () => {
      template.hasResourceProperties(AWS_COGNIT_USER_POOL, {
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
  })

  describe(AWS_COGNIT_USER_POOL_CLIENT, () => {
    it('should create a user pool client', () => {
      template.resourceCountIs(AWS_COGNIT_USER_POOL_CLIENT, 1)
    })
  })
})
