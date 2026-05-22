import type React from "react"
import type { Metadata } from "next"
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import { MetaPixel } from "@/components/MetaPixel"
import { GoogleTag } from "@/components/GoogleTag"
import { absoluteUrl, getOgImage, siteConfig } from "@/lib/seo"
import "./globals.css"

const syne = Syne({
  subsets: ["latin"],
  variable: "--ff-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--ff-body",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
})

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--ff-mono",
  weight: ["400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | BI Geek",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  keywords: [
    "formation Power BI Tunisie",
    "formation Data Analytics Tunisie",
    "bootcamp Data Analytics Tunisie",
    "formation Business Intelligence Tunisie",
    "formation SQL Tunisie",
    "formation Python Data Analysis",
    "formation Cloud Tunisie",
    "formation Cyber Security Tunisie",
    "formation développement web Tunisie",
    "centre de formation tech Tunisie",
    "certification Power BI Tunisie",
    "formation entreprise Data IA Cloud",
  ],
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: getOgImage(siteConfig.og.home),
        width: 1200,
        height: 630,
        alt: "BI Geek - centre de formation tech en Tunisie",
      },
    ],
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [getOgImage(siteConfig.og.home)],
  },
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["EducationalOrganization", "LocalBusiness"],
  name: siteConfig.name,
  url: siteConfig.url,
  logo: absoluteUrl("/icon.png"),
  image: getOgImage(siteConfig.og.home),
  description:
    "Centre de formation technologique spécialisé en Data Analytics, Business Intelligence, IA, Cloud, Cyber Security, développement web et management.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "53 Rue du Lac Léman, Les Berges du Lac",
    addressLocality: "Tunis",
    addressCountry: "TN",
  },
  areaServed: ["TN", "Tunisie"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+21658611283",
      contactType: "customer support",
      areaServed: "TN",
      availableLanguage: ["fr", "ar"],
    },
  ],
  sameAs: [siteConfig.url],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <head>
        <Script id="ld-json-organization" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(organizationJsonLd)}
        </Script>
      </head>
      <body className={`${syne.variable} ${dmSans.variable} ${jbMono.variable} font-sans antialiased bg-background text-foreground`}>
        <MetaPixel />
        <GoogleTag />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
