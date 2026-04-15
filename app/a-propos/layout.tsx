import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "À propos | BI Geek — Centre de formation tech en Tunisie",
  description:
    "Découvrez la mission, l'histoire et les valeurs de BI Geek. Un centre de formation tech basé en Tunisie qui forme des professionnels immédiatement opérationnels en Data, IA, Cloud, Cyber Security et Web.",
  openGraph: {
    title: "À propos | BI Geek — Centre de formation tech en Tunisie",
    description:
      "BI Geek forme les talents tech de demain grâce à une pédagogie ancrée dans le réel, des formateurs experts et des projets concrets.",
    url: "https://bi-geek.net/a-propos",
    siteName: "BI Geek",
    images: [
      {
        url: "https://bi-geek.net/placeholder-course.png",
        width: 1200,
        height: 630,
        alt: "BI Geek — À propos",
      },
    ],
    locale: "fr-FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "À propos | BI Geek",
    description:
      "Former. Innover. Devenir. Le centre de formation tech qui accélère les carrières en Tunisie.",
  },
  alternates: {
    canonical: "https://bi-geek.net/a-propos",
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
