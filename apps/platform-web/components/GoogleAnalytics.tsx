'use client'

import { useTenantAnalytics } from '@/lib/tenant-context'
import Script from 'next/script'

/**
 * Google Analytics & Facebook Pixel Component
 *
 * Injects tracking scripts for the current tenant.
 * Only renders if the tenant has configured tracking IDs.
 *
 * Supports:
 * - GA4 Measurement ID (G-XXXXXXXXXX)
 * - Google Tag Manager (GTM-XXXXXX)
 * - Facebook Pixel (XXXXXXXXXXXXXXXX)
 */
export function GoogleAnalytics() {
  const { gaMeasurementId, gtmId, fbPixelId } = useTenantAnalytics()

  if (!gaMeasurementId && !gtmId && !fbPixelId) {
    return null
  }

  return (
    <>
      {/* Google Tag Manager */}
      {gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              title="Google Tag Manager"
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Google Analytics (GA4) */}
      {gaMeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `,
            }}
          />
        </>
      )}

      {/* Facebook Pixel */}
      {fbPixelId && (
        <>
          <Script
            id="fb-pixel-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${fbPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
    </>
  )
}

/**
 * Hook to track events with tenant's analytics
 */
export function useAnalytics() {
  const { gaMeasurementId, fbPixelId } = useTenantAnalytics()

  return {
    trackEvent: (eventName: string, parameters?: Record<string, any>) => {
      if (typeof window !== 'undefined' && window.gtag && gaMeasurementId) {
        window.gtag('event', eventName, parameters)
      }
      if (typeof window !== 'undefined' && (window as any).fbq && fbPixelId) {
        (window as any).fbq('trackCustom', eventName, parameters)
      }
    },
    trackPageView: (page: string, title?: string) => {
      if (typeof window !== 'undefined' && window.gtag && gaMeasurementId) {
        window.gtag('event', 'page_view', {
          page_location: window.location.href,
          page_title: title || document.title,
          page_path: page,
        })
      }
      if (typeof window !== 'undefined' && (window as any).fbq && fbPixelId) {
        (window as any).fbq('track', 'PageView')
      }
    },
    trackConversion: (sendTo: string, value?: number, currency?: string) => {
      if (typeof window !== 'undefined' && window.gtag && gaMeasurementId) {
        window.gtag('event', 'conversion', {
          send_to: sendTo,
          value: value,
          currency: currency,
        })
      }
      if (typeof window !== 'undefined' && (window as any).fbq && fbPixelId) {
        (window as any).fbq('track', 'Purchase', {
          value: value,
          currency: currency,
        })
      }
    },
    trackFBEvent: (eventName: string, parameters?: Record<string, any>) => {
      if (typeof window !== 'undefined' && (window as any).fbq && fbPixelId) {
        (window as any).fbq('track', eventName, parameters)
      }
    },
  }
}

/**
 * Extend Window interface for gtag and fbq
 */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
  }
}
