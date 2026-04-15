import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Formation entreprise | BI Geek — Montée en compétences de vos équipes",
  description:
    "BI Geek accompagne les entreprises dans la montée en compétences de leurs équipes tech. Programmes sur mesure en Data, IA, Cloud, Cyber Security et Web, dispensés par des experts certifiés.",
  openGraph: {
    title: "Formation entreprise | BI Geek",
    description:
      "Des programmes de formation tech sur mesure pour renforcer les compétences de vos collaborateurs. Audit, formation, certification et suivi individualisé.",
    url: "https://bi-geek.net/entreprises",
    siteName: "BI Geek",
    images: [
      {
        url: "https://bi-geek.net/placeholder-course.png",
        width: 1200,
        height: 630,
        alt: "BI Geek Entreprises — Formation professionnelle",
      },
    ],
    locale: "fr-FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Formation entreprise | BI Geek",
    description:
      "Renforcez les compétences tech de vos équipes avec des programmes sur mesure délivrés par des experts en activité.",
  },
  alternates: {
    canonical: "https://bi-geek.net/entreprises",
  },
}

export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
