import type { Metadata } from "next"
import PocketBase from "pocketbase"
import CourseDetailsClient from "@/components/course-details-client"

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const pb = new PocketBase(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090")

  try {
    const course = await pb.collection("courses").getOne(params.id)

    const title = course.title || "Course"
    const description = course.shortDescription || "Course details"

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://bi-geek.net/course/${params.id}`,
        images: course.coverImage
          ? [
              {
                url: `${process.env.POCKETBASE_URL}/api/files/courses/${course.id}/${course.coverImage}`,
                width: 1200,
                height: 630,
              },
            ]
          : undefined,
      },
    }
  } catch (err) {
    console.error("Failed to fetch course for metadata:", err)
    return {
      title: "Course",
      description: "Course details",
    }
  }
}

export default function CourseDetailsPageWrapper() {
  return <CourseDetailsClient />
}
