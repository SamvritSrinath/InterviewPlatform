'use client'

import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { useServerInsertedHTML } from 'next/navigation'
import { useState } from 'react'

export default function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => {
    const cache = createCache({ key: 'mui', prepend: true })
    cache.compat = true
    return cache
  })

  useServerInsertedHTML(() => {
    const names = Object.keys(cache.inserted)
    if (names.length === 0) {
      return null
    }
    let styles = ''
    for (const name of names) {
      styles += cache.inserted[name]
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    )
  })

  return <CacheProvider value={cache}>{children}</CacheProvider>
}

