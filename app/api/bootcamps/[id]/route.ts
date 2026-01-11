// /api/bootcamps/[id]/route.ts
import PocketBase from "pocketbase"
import { NextResponse } from "next/server"

const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090"

// Helper to get full file URL
const getFileUrl = (record: any, file: string | null) => {
  if (!file) return null
  return `${PB_URL}/api/files/${record.collectionId}/${record.id}/${file}`
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const pb = new PocketBase(PB_URL)

    // 1) Bootcamp
    const bootcampRaw = await pb.collection("bootcamps").getOne(id)

    const bootcamp = {
      ...bootcampRaw,
      image: getFileUrl(bootcampRaw, bootcampRaw.coverImage ?? bootcampRaw.image),
      prerequis: bootcampRaw.prerequis ?? null,
    }

    // 2) Pivot courses inside bootcamp
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
        whatYouWillLearn: c.whatYouWillLearn ?? [],
        prerequis: c.prerequis ?? "Aucun",
        image: getFileUrl(c, c.coverImage ?? c.image),
        certificate: !!c.certificate,
        certifications: c.certifications ?? [],
      }))

    // 3) Modules for all courses
    const courseFilter = courses.map(c => `course="${c.id}"`).join(" || ")
    const modules = courseFilter
      ? await pb.collection("course_modules").getFullList({
          filter: courseFilter,
          sort: "course,order",
        })
      : []

    // 4) Lessons for all modules
    const moduleFilter = modules.map(m => `module="${m.id}"`).join(" || ")
    const lessons = moduleFilter
      ? await pb.collection("course_lessons").getFullList({
          filter: moduleFilter,
          sort: "module,order",
        })
      : []

    return NextResponse.json({ bootcamp, courses, modules, lessons })
  } catch (err) {
    console.error("Error fetching bootcamp details:", err)
    return NextResponse.json(
      { error: "Failed to fetch bootcamp details" },
      { status: 500 }
    )
  }
}
