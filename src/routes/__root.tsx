/// <reference types="vite/client" />
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { LicenseInfo } from '@mui/x-license'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import globalStyles from '@/styles/global.css?url'

// MUI X Premium License (KV=2, perpetual, Q3-2024, expires 2999)
const muiLicenseKey = import.meta.env.VITE_MUI_X_LICENSE_KEY || 'c9303c1fa5440a8bbad692db058007f9Tz0xLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxQVj1RMy0yMDI0LEtWPTI='
LicenseInfo.setLicenseKey(muiLicenseKey)

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Systematic - Matched Betting Platform' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' },
      { rel: 'stylesheet', href: globalStyles },
    ],
  }),
})

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
