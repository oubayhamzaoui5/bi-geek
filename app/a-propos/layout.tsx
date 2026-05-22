import type { Metadata } from "next"
import { getOgImage, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Découvrez la mission, l'histoire et les valeurs de BI Geek, centre de formation tech en Tunisie spécialisé en Data, IA, Cloud, Cyber Security et développement web.",
  alternates: {
    canonical: "/a-propos",
  },
  openGraph: {
    title: "À propos | BI Geek",
    description:
      "BI Geek forme les talents tech de demain avec une pédagogie pratique, des formateurs experts et des projets concrets.",
    url: "/a-propos",
    siteName: siteConfig.name,
    images: [
      {
        url: getOgImage(siteConfig.og.about),
        width: 1200,
        height: 630,
        alt: "BI Geek - à propos du centre de formation tech",
      },
    ],
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "À propos | BI Geek",
    description: "Le centre de formation tech qui accélère les carrières en Tunisie.",
    images: [getOgImage(siteConfig.og.about)],
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
