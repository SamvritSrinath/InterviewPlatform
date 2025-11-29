'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './navbar'

/**
 * Conditionally renders the Material-UI navbar based on the current route.
 * Hides navbar for archive, question view, and honeypot routes to preserve
 * the original clean styling of those pages.
 */
export function ConditionalNavbar() {
  const pathname = usePathname()
  
  // Routes that should NOT show the Material-UI navbar
  // These routes have their own layouts with custom headers
  const hideNavbarRoutes = [
    '/archive',
    '/q/',
    '/docs/',
  ]
  
  // Check if current route should hide navbar
  const shouldHideNavbar = hideNavbarRoutes.some(route => 
    pathname?.startsWith(route)
  )
  
  if (shouldHideNavbar) {
    return null
  }
  
  return <Navbar />
}

