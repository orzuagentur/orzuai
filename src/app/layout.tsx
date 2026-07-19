import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";

import { APP_ORIGIN } from "@/constants/app-origin";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_ORIGIN),
  applicationName: "OrzuX",
  title: {
    default: "OrzuX | AI Business Communication Platform",
    template: "%s | OrzuX",
  },
  description:
    "OrzuX helps businesses reply to customers, manage CRM, handle follow-ups, and run an autonomous AI agent across messaging channels.",
  keywords: [
    "OrzuX",
    "OrzuX",
    "AI communication platform",
    "AI inbox",
    "customer service AI",
    "WhatsApp Business CRM",
    "Instagram DM inbox",
    "Telegram CRM",
    "AI voice agent",
    "CRM platform",
    "calendar booking",
  ],
  authors: [{ name: "OrzuX" }],
  creator: "OrzuX",
  publisher: "OrzuX",
  category: "business software",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: APP_ORIGIN,
    siteName: "OrzuX",
    title: "OrzuX | AI Business Communication Platform",
    description:
      "AI-powered inbox, CRM, calendar, and customer communication for modern businesses.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OrzuX | AI Business Communication Platform",
    description:
      "AI-powered inbox, CRM, calendar, and customer communication for modern businesses.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "OrzuX",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/platform-icon-light.png", type: "image/png" }],
    apple: [{ url: "/platform-icon-light.png", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#f3f4f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";localStorage.setItem("theme","light");}catch(e){}})();`}
        </Script>
        <Script id="ga-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              functionality_storage: 'granted',
              security_storage: 'granted',
              wait_for_update: 500
            });
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
