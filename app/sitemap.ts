import type { MetadataRoute } from "next"
import { absoluteUrl, siteConfig } from "@/lib/seo"

type Program = {
  id: string
  slug?: string
}

async function fetchPrograms(endpoint: "courses" | "bootcamps"): Promise<Program[]> {
  try {
    const res = await fetch(absoluteUrl(`/api/${endpoint}`), {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []

    const data = await res.json()
    return data[endpoint] ?? []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const [courses, bootcamps] = await Promise.all([
    fetchPrograms("courses"),
    fetchPrograms("bootcamps"),
  ])

  const staticUrls: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/formations"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/entreprises"), lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: absoluteUrl("/a-propos"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ]

  const courseUrls: MetadataRoute.Sitemap = courses.map((course) => ({
    url: absoluteUrl(`/formation/${course.slug || course.id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  const bootcampUrls: MetadataRoute.Sitemap = bootcamps.map((bootcamp) => ({
    url: absoluteUrl(`/bootcamp/${bootcamp.slug || bootcamp.id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  }))

  return [...staticUrls, ...bootcampUrls, ...courseUrls]
}
