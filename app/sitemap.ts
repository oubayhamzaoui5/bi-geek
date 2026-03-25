import { MetadataRoute } from "next"

type Course = {
  id: string
  title: string
}

type Bootcamp = {
  id: string
  title: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is missing in .env")
  }

  // Fetch courses
  let courses: Course[] = []
  let bootcamps: Bootcamp[] = []
  try {
    const coursesRes = await fetch(`${siteUrl}/api/courses`)
    if (coursesRes.ok) {
      const coursesData = await coursesRes.json()
      courses = coursesData.courses ?? []
    }
  } catch {}
  try {
    const bootcampsRes = await fetch(`${siteUrl}/api/bootcamps`)
    if (bootcampsRes.ok) {
      const bootcampsData = await bootcampsRes.json()
      bootcamps = bootcampsData.bootcamps ?? []
    }
  } catch {}

  const courseUrls = courses.map((c) => ({
    url: `${siteUrl}/course/${c.id}`,
    lastModified: new Date().toISOString(),
  }))

  const bootcampUrls = bootcamps.map((b) => ({
    url: `${siteUrl}/bootcamp/${b.id}`,
    lastModified: new Date().toISOString(),
  }))

  return [
    { url: `${siteUrl}`, lastModified: new Date() },
    { url: `${siteUrl}/courses`, lastModified: new Date() },
    { url: `${siteUrl}/bootcamps`, lastModified: new Date() },
    ...courseUrls,
    ...bootcampUrls,
  ]
}
