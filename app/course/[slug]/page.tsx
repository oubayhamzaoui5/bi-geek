import type { Metadata } from "next";
import PocketBase from "pocketbase";
import CourseDetailsClient from "@/components/course-details-client";

type Params = Promise<{ slug: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  console.log("generateMetadata started");

  const params = await props.params;
  console.log("params resolved:", params);

  const { slug } = params;
  console.log("slug:", slug);

  const pb = new PocketBase(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090");
  console.log("PocketBase URL:", process.env.POCKETBASE_URL);

  try {
    const course = await pb.collection("courses").getFirstListItem(`slug="${slug}"`);
    console.log("course found:", course);

    const title = course.title || "Course";
    const description = course.shortDescription || "Course details";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://bi-geek.net/course/${slug}`,
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
    };
  } catch (err) {
    console.error("Failed to fetch course for metadata:", err);

    // return minimal metadata so it doesn't block rendering
    return {
      title: "Course",
      description: "Course details",
    };
  }
}

export default function CourseDetailsPageWrapper() {
  return <CourseDetailsClient />;
}