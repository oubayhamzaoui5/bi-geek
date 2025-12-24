// /api/courses/[id]/route.ts
import PocketBase from "pocketbase"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

    // 1) Course with instructor expanded
    const courseRecord = await pb.collection("courses").getOne(id, {
      expand: "instructor",
    })

    const guestCourse = {
      id: courseRecord.id,
      title: courseRecord.title,
      shortDescription: courseRecord.shortDescription,
      longDescription: courseRecord.longDescription,
      durationLabel: courseRecord.durationLabel,
      levelLabel: courseRecord.levelLabel,
      certificate: courseRecord.certificate,
      rating: courseRecord.rating,
      reviewsCount: courseRecord.reviewsCount,
      whatYouWillLearn: courseRecord.whatYouWillLearn ?? [],
    }

    // Instructor
    let instructorFromPb
    const instructorRecord = (courseRecord.expand as any)?.instructor
    if (instructorRecord) {
      const inst = Array.isArray(instructorRecord) ? instructorRecord[0] : instructorRecord
      instructorFromPb = {
        fullName: `${inst.firstName} ${inst.lastName}`,
        title: inst.title,
        description: inst.description,
        avatarUrl: `${pb.baseUrl}/api/files/instructors/${inst.id}/${inst.avatar}`,
        linkedinLink: inst.linkedinLink ?? "",
      }
    }

    // Modules
    const moduleRecords = await pb.collection("course_modules").getFullList({
      filter: `course="${id}"`,
      sort: "order",
    })

    const lessonRecords = await pb.collection("course_lessons").getFullList({
      filter: `course="${id}"`,
      sort: "order",
    })

    const guestModules = moduleRecords.map((m: any) => {
      const lessonsForModule = lessonRecords.filter((l: any) => l.module === m.id)
      const lessons = lessonsForModule.map((l: any) => ({
        title: l.title,
        duration: l.durationLabel,
      }))
      return {
        title: m.title,
        duration: m.durationLabel,
        lessons,
      }
    })

    return NextResponse.json({ guestCourse, instructorFromPb, guestModules })
  } catch (err) {
    console.error("Error fetching course details:", err)
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 })
  }
}
