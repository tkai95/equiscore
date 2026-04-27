'use client'
import { useEffect, useState } from 'react'
import Script from 'next/script'

export function Analytics({ gaId }: { gaId: string }) {
  const [load, setLoad] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('cookie-consent') === 'all') {
      setLoad(true)
    }
    function onConsent() {
      setLoad(true)
    }
    window.addEventListener('cookie-consent-accepted', onConsent)
    return () => window.removeEventListener('cookie-consent-accepted', onConsent)
  }, [])

  if (!load) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `}</Script>
    </>
  )
}
