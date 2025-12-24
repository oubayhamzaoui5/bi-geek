// /api/bootcamps/[id]/route.ts
import PocketBase from "pocketbase"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

    // 1) Bootcamp
    const bootcamp = await pb.collection("bootcamps").getOne(id)

    // 2) Pivot courses in this bootcamp
    const pivots = await pb.collection("bootcamp_courses").getFullList({
      filter: `bootcamp="${id}"`,
      sort: "order",
      expand: "course",
    })

    const courses = pivots
      .map((p: any) => p.expand?.course)
      .filter(Boolean)
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        shortDescription: c.shortDescription,
        longDescription: c.longDescription,
        durationLabel: c.durationLabel,
        levelLabel: c.levelLabel,
        whatYouWillLearn: c.whatYouWillLearn ?? [],
      }))

    // 3) Modules for courses
    const courseFilter = courses.map((c: any) => `course="${c.id}"`).join(" || ")
    const modules = await pb.collection("course_modules").getFullList({
      filter: courseFilter,
      sort: "course,order",
    })

    // 4) Lessons for modules
    const moduleFilter = modules.map((m: any) => `module="${m.id}"`).join(" || ")
    const lessons = await pb.collection("course_lessons").getFullList({
      filter: moduleFilter,
      sort: "module,order",
    })

    return NextResponse.json({ bootcamp, courses, modules, lessons })
  } catch (err) {
    console.error("Error fetching bootcamp details:", err)
    return NextResponse.json({ error: "Failed to fetch bootcamp details" }, { status: 500 })
  }
}
