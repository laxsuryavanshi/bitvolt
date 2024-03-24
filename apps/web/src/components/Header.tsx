import { Button, Heading, Image, View, useAuthenticator } from '@aws-amplify/ui-react'

function Header() {
  const { signOut, isPending } = useAuthenticator()

  return (
    <View as="header" className="sticky w-full top-0 h-16 border-b flex items-center px-8">
      <View className="flex items-center">
        <Image src="/photos-96.png" alt="BitVolt Logo" height={42} width={42} />
        <Heading level={5}>BitVolt</Heading>
      </View>
      <View className="flex gap-2 ml-auto">
        <Button size="small" isLoading={isPending} loadingText="Signing Out" onClick={signOut}>
          Sign Out
        </Button>
      </View>
    </View>
  )
}

export default Header
