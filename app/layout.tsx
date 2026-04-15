import type React from "react"
import type { Metadata } from "next"
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import Script from "next/script"
import { MetaPixel } from "@/components/MetaPixel"
import { GoogleTag } from "@/components/GoogleTag"

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
  title: "BI Geek | Centre de formation en technologie (Data, IA, Cloud, Cyber)",
  description:
    "BI Geek est un centre de formation technologique spécialisé en Data, IA, Cloud, Cyber Security, Web Development et Management. Formations pratiques, projets réels, certification.",
  generator: "v0.app",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "BI Geek | Centre de formation en technologie",
    description:
      "Formations en Data, IA, Cloud, Cyber Security, Web Development et Management. Projets réels, mentors experts, certification.",
    url: "https://bi-geek.net",
    siteName: "BI Geek",
    images: [
      {
        url: "https://bi-geek.net/placeholder-course.png",
        width: 1200,
        height: 630,
        alt: "BI Geek - Centre de formation technologique",
      },
    ],
    locale: "fr-FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BI Geek | Centre de formation en technologie",
    description:
      "Formations en Data, IA, Cloud, Cyber Security, Web Development et Management. Projets réels, mentors experts, certification.",
    images: ["https://bi-geek.net/placeholder-course.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <head>
        <Script id="ld-json" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "BI Geek",
            url: "https://bi-geek.net",
            logo: "https://bi-geek.net/icon.png",
            description:
              "Centre de formation technologique spécialisé en Data, IA, Cloud, Cyber Security, Web Development et Management.",
            contactPoint: [
              {
                "@type": "ContactPoint",
                telephone: "+21658611283",
                contactType: "customer support",
                areaServed: "TN",
                availableLanguage: "fr",
              },
            ],
          })}
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
