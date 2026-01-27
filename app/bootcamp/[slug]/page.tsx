import type { Metadata } from "next"
import PocketBase from "pocketbase"
import BootcampDetailsClient from "@/components/bootcamp-details-client"

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const pb = new PocketBase(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090")

  try {
    const bootcamp = await pb
      .collection("bootcamps")
      .getFirstListItem(`slug="${params.slug}"`)

    const title = bootcamp.title || "Bootcamp"
    const description =
      bootcamp.shortDescription || bootcamp.description || "Bootcamp details"

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://bi-geek.net/bootcamp/${params.slug}`,
        images: bootcamp.coverImage
          ? [
              {
                url: `${process.env.POCKETBASE_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`,
                width: 1200,
                height: 630,
              },
            ]
          : undefined,
      },
    }
  } catch (err) {
    console.error("Failed to fetch bootcamp for metadata:", err)
    return {
      title: "Bootcamp",
      description: "Bootcamp details",
    }
  }
}

export default function BootcampDetailsPageWrapper() {
  return <BootcampDetailsClient />
}