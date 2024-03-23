import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'

export class BitvoltStack extends cdk.Stack {
  private static _instance?: BitvoltStack

  readonly name: string = 'bitvolt'

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    if (typeof BitvoltStack._instance !== 'undefined') {
      throw new Error('BitvoltStack is already instantiated')
    }

    super(scope, id, props)

    const userPool = this._createUserPool()
    this._createUserPoolClient(userPool)

    BitvoltStack._instance = this
  }

  static get instance() {
    return this._instance
  }

  private _createUserPool(): cognito.UserPool {
    return new cognito.UserPool(this, `${this.name}UserPool`, {
      // Contact administrator to reset password
      accountRecovery: cognito.AccountRecovery.NONE,
      autoVerify: {
        email: true,
      },
      deletionProtection: false,
      keepOriginal: {
        email: true,
      },
      mfa: cognito.Mfa.OFF,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      signInAliases: {
        username: false,
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
    })
  }

  private _createUserPoolClient(userPool: cognito.IUserPool): cognito.UserPoolClient {
    return new cognito.UserPoolClient(this, `${this.name}UserPoolClient`, {
      authFlows: {
        userSrp: true,
        custom: true,
      },
      preventUserExistenceErrors: true,
      userPool,
    })
  }
}
