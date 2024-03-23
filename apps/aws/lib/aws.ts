#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { BitvoltStack } from './aws-stack'

const app = new cdk.App()

new BitvoltStack(app, 'BitvoltStack')
