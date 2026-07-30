import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { routing, ogLocale, type AppLocale } from "@/i18n/routing";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-dm-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (hasLocale(routing.locales, raw) ? raw : "en") as AppLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  const site = (
    process.env.NEXT_PUBLIC_APP_URL || "https://www.orzuai.com"
  ).replace(/\/$/, "");

  const languages: Record<string, string> = {
    "x-default": `${site}/en`,
  };
  for (const l of routing.locales) {
    languages[l] = `${site}/${l}`;
  }

  return {
    title: {
      default: t("titleDefault"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    keywords: t("keywords")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    alternates: {
      canonical: `${site}/${locale}`,
      languages,
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${site}/${locale}`,
      siteName: "OrzuAi",
      locale: ogLocale[locale],
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => ogLocale[l]),
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "OrzuAi",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
      images: ["/og.png"],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) {
    notFound();
  }
  const locale = raw as AppLocale;
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "meta" });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "OrzuAi",
      url: "https://www.orzuai.com",
      email: "support@orzuai.com",
      logo: "https://www.orzuai.com/logo-mark.png",
      image: "https://www.orzuai.com/og.png",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "OrzuAi",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      url: `https://www.orzuai.com/${locale}`,
      description: t("description"),
      inLanguage: locale,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      publisher: {
        "@type": "Organization",
        name: "OrzuAi",
        url: "https://www.orzuai.com",
        logo: "https://www.orzuai.com/logo-mark.png",
      },
      image: "https://www.orzuai.com/og.png",
    },
  ];

  return (
    <html lang={locale} className={`${syne.variable} ${manrope.variable} h-full`}>
      <head>
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title="OrzuAi"
          href="/opensearch.xml"
        />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link rel="alternate" type="text/plain" href="/ai.txt" title="ai.txt" />
      </head>
      <body className="min-h-full antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {children}
          <PwaRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
