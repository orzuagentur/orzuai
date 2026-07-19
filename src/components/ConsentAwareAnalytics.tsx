"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import {
  applyAnalyticsConsent,
  hasAnalyticsConsent,
  readCookieConsent,
  type StoredCookieConsent,
} from "@/features/cookies/consent";

const GA_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() || "G-JDJV13PM0T";

/**
 * Loads Google Analytics only after the user opts into analytics cookies.
 */
export function ConsentAwareAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    function sync(consent: StoredCookieConsent | null = readCookieConsent()) {
      const next = hasAnalyticsConsent(consent);
      setAllowed(next);
      applyAnalyticsConsent(next);
    }

    sync();

    function onConsent(event: Event) {
      const detail = (event as CustomEvent<StoredCookieConsent>).detail;
      sync(detail ?? readCookieConsent());
    }

    window.addEventListener("orzux-cookie-consent", onConsent);
    return () => window.removeEventListener("orzux-cookie-consent", onConsent);
  }, []);

  if (!allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
