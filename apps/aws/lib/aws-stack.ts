import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'

export interface BitvoltStackResources {
  userPool: cognito.IUserPool
  userPoolClient: cognito.IUserPoolClient
  identityPool: cognito.CfnIdentityPool
  identityPoolRoleAttachment: cognito.CfnIdentityPoolRoleAttachment
  authenticatedUserRole: iam.IRole
  unauthenticatedUserRole: iam.IRole
  bucket: s3.IBucket
}

export class BitvoltStack extends cdk.Stack {
  private static _instance?: BitvoltStack

  readonly name: string = 'bitvolt'

  readonly resources = {} as BitvoltStackResources

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    if (typeof BitvoltStack._instance !== 'undefined') {
      throw new Error('BitvoltStack is already instantiated')
    }

    super(scope, id, props)

    const userPool = this._createUserPool()
    const userPoolClient = this._createUserPoolClient(userPool)
    this._createIdentityPool(userPool, userPoolClient)
    const bucket = this._createS3Bucket()

    BitvoltStack._instance = this
    this.resources.userPool = userPool
    this.resources.userPoolClient = userPoolClient
    this.resources.bucket = bucket
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

  private _createIdentityPool(
    userPool: cognito.IUserPool,
    userPoolClient: cognito.IUserPoolClient
  ) {
    const identityPool = new cognito.CfnIdentityPool(this, `${this.name}IdentityPool`, {
      allowUnauthenticatedIdentities: false,
    })
    const roles = this._createAuthenticationRoles(identityPool.ref)
    const identityPoolRoleAttachment = new cognito.CfnIdentityPoolRoleAttachment(
      this,
      `${this.name}IdentityPoolRoleAttachment`,
      {
        identityPoolId: identityPool.ref,
        roles: {
          unauthenticated: roles.unauthenticated.roleArn,
          authenticated: roles.authenticated.roleArn,
        },
        roleMappings: {
          UserPoolWebClientRoleMapping: {
            type: 'Token',
            ambiguousRoleResolution: 'AuthenticatedRole',
            identityProvider: `cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}:${userPoolClient.userPoolClientId}`,
          },
        },
      }
    )
    identityPoolRoleAttachment.addDependency(identityPool)
    identityPoolRoleAttachment.node.addDependency(userPoolClient)
    identityPool.cognitoIdentityProviders = [
      {
        clientId: userPoolClient.userPoolClientId,
        providerName: `cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      },
    ]

    this.resources.identityPool = identityPool
    this.resources.authenticatedUserRole = roles.authenticated
    this.resources.unauthenticatedUserRole = roles.unauthenticated
    this.resources.identityPoolRoleAttachment = identityPoolRoleAttachment
  }

  private _createAuthenticationRoles(identityPoolId: string) {
    return {
      authenticated: new iam.Role(this, `${this.name}AuthenticatedUserRole`, {
        assumedBy: new iam.FederatedPrincipal(
          'cognito-identity.amazonaws.com',
          {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identityPoolId,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
          },
          'sts:AssumeRoleWithWebIdentity'
        ),
      }),
      unauthenticated: new iam.Role(this, `${this.name}UnauthenticatedUserRole`, {
        assumedBy: new iam.FederatedPrincipal(
          'cognito-identity.amazonaws.com',
          {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identityPoolId,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'unauthenticated',
            },
          },
          'sts:AssumeRoleWithWebIdentity'
        ),
      }),
    }
  }

  private _createS3Bucket(): s3.Bucket {
    return new s3.Bucket(this, `${this.name}S3Bucket`, {
      versioned: false,
      cors: [
        {
          maxAge: 3000,
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag',
          ],
          allowedHeaders: ['*'],
          allowedOrigins: ['*'],
          allowedMethods: [
            s3.HttpMethods.DELETE,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
        },
      ],
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
  }
}
