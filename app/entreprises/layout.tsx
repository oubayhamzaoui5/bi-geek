import type { Metadata } from "next"
import { getOgImage, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Formation entreprise",
  description:
    "BI Geek accompagne les entreprises dans la montée en compétences de leurs équipes tech avec des programmes sur mesure en Data, IA, Cloud, Cyber Security et développement web.",
  alternates: {
    canonical: "/entreprises",
  },
  openGraph: {
    title: "Formation entreprise | BI Geek",
    description:
      "Des programmes de formation tech sur mesure pour renforcer les compétences de vos collaborateurs : audit, formation, certification et suivi individualisé.",
    url: "/entreprises",
    siteName: siteConfig.name,
    images: [
      {
        url: getOgImage(siteConfig.og.enterprise),
        width: 1200,
        height: 630,
        alt: "BI Geek Entreprises - formation professionnelle tech",
      },
    ],
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Formation entreprise | BI Geek",
    description:
      "Renforcez les compétences tech de vos équipes avec des formations sur mesure en Data, IA, Cloud et Cyber Security.",
    images: [getOgImage(siteConfig.og.enterprise)],
  },
}

export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
