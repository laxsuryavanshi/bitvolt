'use client';

import Link from 'next/link';

import {
  createTheme as createMuiTheme,
  PaletteMode,
  responsiveFontSizes,
} from '@mui/material/styles';

const createTheme = (mode: PaletteMode = 'light') => {
  return createMuiTheme({
    cssVariables: true,
    typography: {
      fontFamily: 'var(--turtleby-font-family)',
      button: {
        textTransform: 'none',
        fontWeight: 'inherit',
      },
    },
    palette: { mode },
    components: {
      MuiLink: {
        defaultProps: {
          component: Link,
        },
      },
      MuiButtonBase: {
        defaultProps: {
          LinkComponent: Link,
        },
      },
    },
  });
};

const theme = responsiveFontSizes(createTheme());

export { theme };
