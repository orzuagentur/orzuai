import type { Metadata } from "next";
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
  title: "OrzuX",
  description: "AI Business Communication Platform",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
