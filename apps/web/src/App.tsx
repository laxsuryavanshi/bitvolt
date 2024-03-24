import { Amplify } from 'aws-amplify'
import { Authenticator, Heading, Image, Text, View, useTheme } from '@aws-amplify/ui-react'

import '@aws-amplify/ui-react/styles.css'
import Home from './components/Home'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    },
  },
})

function App() {
  return (
    <Authenticator loginMechanisms={['email']} hideSignUp components={components}>
      <Home />
    </Authenticator>
  )
}

const components = {
  Header() {
    const { tokens } = useTheme()

    return (
      <View padding={tokens.space.large} className="flex items-center justify-center -ml-8">
        <Image alt="BitVolt" src="/photos-96.png" />
        <View>
          <Heading level={3}>BitVolt</Heading>
          <Text fontSize={tokens.fontSizes.small} fontWeight={tokens.fontWeights.bold}>
            turtleby
          </Text>
        </View>
      </View>
    )
  },

  Footer() {
    const { tokens } = useTheme()

    return (
      <View padding={tokens.space.large} className="text-center">
        <Text color={tokens.colors.neutral[80]}>&copy; All Rights Reserved</Text>
      </View>
    )
  },

  SignIn: {
    Header() {
      const { tokens } = useTheme()

      return (
        <Heading padding={`${tokens.space.xl} 0 0 ${tokens.space.xl}`} level={5}>
          Sign in to your account
        </Heading>
      )
    },

    Footer() {
      return <View className="pb-4 px-8"></View>
    },
  },
}

export default App
