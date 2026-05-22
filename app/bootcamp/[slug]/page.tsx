import type { Metadata } from "next"
import PocketBase from "pocketbase"
import Script from "next/script"
import BootcampDetailsClient from "@/components/bootcamp-details-client"
import { absoluteUrl, getOgImage, siteConfig } from "@/lib/seo"

type Params = Promise<{ slug: string }>

function getPocketBaseUrl() {
  return process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL || "http://127.0.0.1:8090"
}

async function getBootcampBySlug(slug: string) {
  const pbUrl = getPocketBaseUrl()
  const pb = new PocketBase(pbUrl)
  let bootcamp: any

  try {
    bootcamp = await pb.collection("bootcamps").getFirstListItem(`slug="${slug}"`)
  } catch (err: any) {
    if (err?.status === 404) {
      bootcamp = await pb.collection("bootcamps").getOne(slug)
    } else {
      throw err
    }
  }

  const title = bootcamp.title || "Bootcamp BI Geek"
  const description =
    bootcamp.shortDescription ||
    bootcamp.description ||
    "Bootcamp intensif BI Geek pour développer des compétences tech pratiques et certifiantes."
  const image = bootcamp.coverImage
    ? `${pbUrl}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`
    : getOgImage(siteConfig.og.formations)
  const canonical = `/bootcamp/${bootcamp.slug || slug}`

  return { bootcamp, title, description, image, canonical }
}

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params
  const safeSlug = decodeURIComponent(slug)

  try {
    const { title, description, image, canonical } = await getBootcampBySlug(safeSlug)

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
  } catch (err: any) {
    if (err?.status !== 404) {
      console.error("Failed to fetch bootcamp for metadata:", err)
    }

    return {
      title: "Bootcamp BI Geek",
      description:
        "Découvrez un bootcamp BI Geek intensif et certifiant pour accélérer vos compétences tech.",
      alternates: {
        canonical: `/bootcamp/${safeSlug}`,
      },
    }
  }
}

export default async function BootcampDetailsPageWrapper(props: { params: Params }) {
  const { slug } = await props.params
  const safeSlug = decodeURIComponent(slug)
  let jsonLd: Record<string, unknown> | null = null

  try {
    const { title, description, image, canonical } = await getBootcampBySlug(safeSlug)
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
        <Script id={`ld-json-bootcamp-${safeSlug}`} type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(jsonLd)}
        </Script>
      ) : null}
      <BootcampDetailsClient />
    </>
  )
}
