import CoursesPageClient from "@/components/courses-page-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Formations | BI Geek",
  description:
    "Découvrez toutes les formations technologiques BI Geek : Data, IA, Cloud, Cyber Security, Web Development et plus.",
  openGraph: {
    title: "Formations | BI Geek",
    description:
      "Découvrez toutes les formations technologiques BI Geek : Data, IA, Cloud, Cyber Security, Web Development et plus.",
    url: "https://bi-geek.net/courses",
    images: [{ url: "https://bi-geek.net/placeholder-course.png" }],
  },
}

export default function CoursesPage() {
  return <CoursesPageClient />
}
