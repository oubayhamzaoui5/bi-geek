import CoursesPageClient from "@/components/courses-page-client"
import type { Metadata } from "next"
import { Suspense } from "react"
import { getOgImage, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Formations Data, IA, Cloud et Web",
  description:
    "Découvrez les formations BI Geek en Data Analytics, Business Intelligence, Power BI, SQL, Python, IA, Cloud, Cyber Security, développement web et management.",
  alternates: {
    canonical: "/formations",
  },
  openGraph: {
    title: "Formations Data, IA, Cloud et Web | BI Geek",
    description:
      "Catalogue de formations tech BI Geek : Data Analytics, Power BI, SQL, Python, IA, Cloud, Cyber Security, Web Development et Management.",
    url: "/formations",
    siteName: siteConfig.name,
    images: [
      {
        url: getOgImage(siteConfig.og.formations),
        width: 1200,
        height: 630,
        alt: "Catalogue des formations BI Geek",
      },
    ],
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Formations Data, IA, Cloud et Web | BI Geek",
    description:
      "Formations pratiques et certifiantes en Data Analytics, Business Intelligence, IA, Cloud, Cyber Security et développement web.",
    images: [getOgImage(siteConfig.og.formations)],
  },
}

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <CoursesPageClient />
    </Suspense>
  )
}
