import { Source_Sans_3 } from 'next/font/google';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import { S3ConfigProvider } from '@/context/s3config';
import { theme } from './theme';

// @ts-expect-error: allow importing global CSS without type declarations
import './globals.css';

const sourceSans = Source_Sans_3({
  variable: '--turtleby-font-family',
  subsets: ['latin'],
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} antialiased`}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <S3ConfigProvider>{children}</S3ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
