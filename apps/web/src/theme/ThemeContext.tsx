import React, { createContext, useEffect } from 'react'
import {
  ThemeProvider as AmplifyThemeProvider,
  ColorMode,
  Theme,
  defaultDarkModeOverride,
} from '@aws-amplify/ui-react'
import { useLocalStorage } from 'usehooks-ts'

export const ThemeContext = createContext<{
  colorMode: ColorMode
  setColorMode: (colorMode: ColorMode) => void
} | null>(null)

const colorModeKey = 'color-mode'

const theme: Theme = {
  name: 'bitvolt-amplify-theme',
  overrides: [defaultDarkModeOverride],
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [colorMode, setColorMode] = useLocalStorage<ColorMode>(colorModeKey, 'system')

  useEffect(() => {
    document.body.setAttribute(colorModeKey, colorMode)
  }, [colorMode])

  return (
    <ThemeContext.Provider value={{ colorMode, setColorMode }}>
      <AmplifyThemeProvider theme={theme} colorMode={colorMode}>
        {children}
      </AmplifyThemeProvider>
    </ThemeContext.Provider>
  )
}
