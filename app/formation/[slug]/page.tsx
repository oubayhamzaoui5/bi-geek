import type { Metadata } from "next"
import PocketBase from "pocketbase"
import Script from "next/script"
import CourseDetailsClient from "@/components/course-details-client"
import { absoluteUrl, getOgImage, siteConfig } from "@/lib/seo"

type Params = Promise<{ slug: string }>

function getPocketBaseUrl() {
  return process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL || "http://127.0.0.1:8090"
}

async function getCourseBySlug(slug: string) {
  const pbUrl = getPocketBaseUrl()
  const pb = new PocketBase(pbUrl)
  const course = await pb.collection("courses").getFirstListItem(`slug="${slug}"`)
  const title = course.title || "Formation BI Geek"
  const description =
    course.shortDescription ||
    "Formation pratique BI Geek en Data, IA, Cloud, Cyber Security, developpement web et technologies professionnelles."
  const image = course.coverImage
    ? `${pbUrl}/api/files/courses/${course.id}/${course.coverImage}`
    : getOgImage(siteConfig.og.formations)
  const canonical = `/formation/${course.slug || slug}`

  return { course, title, description, image, canonical }
}

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params
  const safeSlug = decodeURIComponent(slug)

  try {
    const { title, description, image, canonical } = await getCourseBySlug(safeSlug)

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title: `${title} | BI Geek`,
        description,
        url: canonical,
        siteName: siteConfig.name,
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        locale: siteConfig.locale,
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    }
  } catch (err) {
    console.error("Failed to fetch course for metadata:", err)

    return {
      title: "Formation BI Geek",
      description:
        "Decouvrez une formation BI Geek pratique et certifiante pour developper vos competences tech.",
      alternates: {
        canonical: `/formation/${safeSlug}`,
      },
    }
  }
}

export default async function FormationDetailsPageWrapper(props: { params: Params }) {
  const { slug } = await props.params
  const safeSlug = decodeURIComponent(slug)
  let jsonLd: Record<string, unknown> | null = null

  try {
    const { title, description, image, canonical } = await getCourseBySlug(safeSlug)
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: title,
      description,
      url: absoluteUrl(canonical),
      image,
      provider: {
        "@type": "EducationalOrganization",
        name: siteConfig.name,
        sameAs: siteConfig.url,
      },
    }
  } catch {
    jsonLd = null
  }

  return (
    <>
      {jsonLd ? (
        <Script id={`ld-json-formation-${safeSlug}`} type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(jsonLd)}
        </Script>
      ) : null}
      <CourseDetailsClient />
    </>
  )
}
