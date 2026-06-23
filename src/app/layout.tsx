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
  title: {
    default: "OrzuX | AI Business Communication Platform",
    template: "%s | OrzuX",
  },
  description:
    "OrzuX helps businesses reply to customers, manage CRM, automate follow-ups, and run an autonomous AI agent across messaging channels.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: APP_ORIGIN,
    siteName: "OrzuX",
    title: "OrzuX | AI Business Communication Platform",
    description:
      "AI-powered inbox, CRM, automation, calendar, and customer communication for modern businesses.",
    images: [
      {
        url: "/platform-icon.png",
        width: 512,
        height: 512,
        alt: "OrzuX",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OrzuX | AI Business Communication Platform",
    description:
      "AI-powered inbox, CRM, automation, calendar, and customer communication for modern businesses.",
    images: ["/platform-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "OrzuX",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: "/platform-icon-light.png",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/platform-icon.png",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#0f172a",
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
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(!t||t==="system")&&d){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.style.colorScheme="light";}}catch(e){}})();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
