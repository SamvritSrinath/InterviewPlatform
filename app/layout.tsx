import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import EmotionRegistry from '@/lib/emotion-registry'
import { ThemeProvider } from '@/components/interview/theme-provider'
import { AuthProvider } from '@/lib/supabase/auth-context'
import { ConditionalNavbar } from '@/components/interview/conditional-navbar'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: '291Y Interview Platform - Coding Problems & Interview Practice',
    template: '%s | 291Y Interview Platform',
  },
  description: 'Modern LeetCode-style platform with coding problems, interview practice, and cheating detection. Browse our problem repository with Python solutions and test cases.',
  keywords: [
    'coding problems',
    'leetcode',
    'interview practice',
    'python programming',
    'algorithm practice',
    'coding interview',
    'problem repository',
    'coding challenges',
  ],
  authors: [{ name: '291Y Team' }],
  creator: '291Y Interview Platform',
  publisher: '291Y Interview Platform',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://your-domain.vercel.app',
    siteName: '291Y Interview Platform',
    title: '291Y Interview Platform - Coding Problems & Interview Practice',
    description: 'Modern LeetCode-style platform with coding problems, interview practice, and cheating detection.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '291Y Interview Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '291Y Interview Platform - Coding Problems & Interview Practice',
    description: 'Modern LeetCode-style platform with coding problems, interview practice, and cheating detection.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <EmotionRegistry>
          <ThemeProvider>
            <AuthProvider>
              <ConditionalNavbar />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </EmotionRegistry>
      </body>
    </html>
  )
}
