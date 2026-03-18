import PocketBase from "pocketbase";
import { NextResponse } from "next/server";

type LessonLink = { url?: string; title?: string; description?: string; order?: number };
type LessonAttachmentMeta = { name?: string; title?: string; description?: string; order?: number };

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090";
    const pb = new PocketBase(PB_URL);

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
        duration: l.durationLabel ?? "",
      }));

      return {
        title: m.title,
        duration: m.durationLabel ?? "",
        locked: !!m.locked,
        lessons,
      };
    });

    const studentModules = moduleRecords.map((m: any) => {
      const lessonsForModule = lessonRecords.filter((l: any) => l.module === m.id);
      const lessons = lessonsForModule.map((l: any) => {
        const attachmentFiles = Array.isArray(l.attachments)
          ? l.attachments
          : l.attachments
          ? [l.attachments]
          : [];
        const attachmentMeta = Array.isArray(l.attachmentsMeta)
          ? (l.attachmentsMeta as LessonAttachmentMeta[])
          : [];

        const attachmentContents = attachmentFiles.map((file: string, idx: number) => ({
          title: attachmentMeta[idx]?.title ?? attachmentMeta[idx]?.name ?? file,
          description: attachmentMeta[idx]?.description ?? "",
          order: attachmentMeta[idx]?.order ?? idx + 1,
          type: "document" as const,
          href: `${PB_URL}/api/files/course_lessons/${l.id}/${file}`,
          lessonId: l.id,
          filename: file,
          courseId: courseRecord.id,
        }));

        const youtubeLinks = Array.isArray(l.youtubeLinks)
          ? (l.youtubeLinks as LessonLink[])
          : [];
        const videoContents = youtubeLinks.map((link, idx: number) => ({
          title: link.title ?? link.description ?? `VidÃ©o ${idx + 1}`,
          description: link.description ?? "",
          order: link.order ?? attachmentFiles.length + idx + 1,
          type: "video" as const,
          href: link.url,
        }));

        return {
          title: l.title,
          duration: l.durationLabel ?? "",
          locked: !!l.locked,
          contents: [...videoContents, ...attachmentContents]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(({ order, ...rest }) => rest),
        };
      });

      return {
        title: m.title,
        duration: m.durationLabel ?? "",
        locked: !!m.locked,
        lessons,
      };
    });

    return NextResponse.json({ guestCourse, guestModules, studentModules });
  } catch (err) {
    console.error("Error fetching course details:", err);
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 });
  }
}
