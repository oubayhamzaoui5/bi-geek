import PocketBase from "pocketbase";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090";
    const pb = new PocketBase(PB_URL);

    // Fetch course by slug
    const courseRecord = await pb
      .collection("courses")
      .getFirstListItem(`slug="${slug}"`);

    const coverImageUrl = courseRecord.coverImage
      ? courseRecord.coverImage.startsWith("http")
        ? courseRecord.coverImage
        : `${PB_URL}/api/files/courses/${courseRecord.id}/${courseRecord.coverImage}`
      : null;

    const guestCourse = {
      id: courseRecord.id,
      title: courseRecord.title,
      shortDescription: courseRecord.shortDescription,
      longDescription: courseRecord.longDescription ?? "",
      durationLabel: courseRecord.durationLabel,
      prerequis: courseRecord.prerequis ?? "Aucun",
      certificate: !!courseRecord.certificate,
      certifications: courseRecord.certifications ?? [],
      rating: courseRecord.rating ?? 4.8,
      reviewsCount: courseRecord.reviewsCount ?? 0,
      whatYouWillLearn: courseRecord.whatYouWillLearn ?? [],
      coverImage: coverImageUrl,
    };

    // Fetch modules
    const moduleRecords = await pb.collection("course_modules").getFullList({
      filter: `course="${courseRecord.id}"`,
      sort: "order",
    });

    const lessonRecords = await pb.collection("course_lessons").getFullList({
      filter: `course="${courseRecord.id}"`,
      sort: "order",
    });

    const guestModules = moduleRecords.map((m: any) => {
      const lessonsForModule = lessonRecords.filter((l: any) => l.module === m.id);
      const lessons = lessonsForModule.map((l: any) => ({
        title: l.title,
        duration: l.durationLabel,
      }));

      return {
        title: m.title,
        duration: m.durationLabel,
        lessons,
      };
    });

    return NextResponse.json({ guestCourse, guestModules });
  } catch (err) {
    console.error("Error fetching course details:", err);
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 });
  }
}