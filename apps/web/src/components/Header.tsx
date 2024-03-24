import {
  Button,
  ColorMode,
  Heading,
  Image,
  ToggleButton,
  ToggleButtonGroup,
  View,
  VisuallyHidden,
  useAuthenticator,
} from '@aws-amplify/ui-react'
import { MdContrast, MdDarkMode, MdLightMode } from 'react-icons/md'

import { useTheme } from '../theme'

function Header() {
  const { signOut, isPending } = useAuthenticator()
  const { colorMode, setColorMode } = useTheme()

  return (
    <View as="header" className="sticky w-full top-0 h-16 border-b flex items-center px-8">
      <View className="flex items-center">
        <Image src="/photos-96.png" alt="BitVolt Logo" height={42} width={42} />
        <Heading level={5}>BitVolt</Heading>
      </View>
      <View className="flex gap-2 ml-auto">
        <ToggleButtonGroup
          value={colorMode}
          isExclusive
          onChange={value => setColorMode(value as ColorMode)}
        >
          <ToggleButton value="light">
            <VisuallyHidden>Light mode</VisuallyHidden>
            <MdLightMode />
          </ToggleButton>
          <ToggleButton value="dark">
            <VisuallyHidden>Dark mode</VisuallyHidden>
            <MdDarkMode />
          </ToggleButton>
          <ToggleButton value="system">
            <VisuallyHidden>System preference</VisuallyHidden>
            <MdContrast />
          </ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" isLoading={isPending} loadingText="Signing Out" onClick={signOut}>
          Sign Out
        </Button>
      </View>
    </View>
  )
}

export default Header
