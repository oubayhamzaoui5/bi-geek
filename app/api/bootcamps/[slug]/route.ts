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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const safeSlug = decodeURIComponent(slug)
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const pb = new PocketBase(PB_URL)

    // 1) Bootcamp
    let bootcampRaw: any
    try {
      bootcampRaw = await pb
        .collection("bootcamps")
        .getFirstListItem(`slug="${safeSlug}"`)
    } catch (err: any) {
      if (err?.status === 404) {
        // Fallback: treat slug as id
        bootcampRaw = await pb.collection("bootcamps").getOne(safeSlug)
      } else {
        throw err
      }
    }

    const bootcamp = {
      ...bootcampRaw,
      image: getFileUrl(bootcampRaw, bootcampRaw.coverImage ?? bootcampRaw.image),
      prerequis: bootcampRaw.prerequis ?? null,
    }

    let group: any = null;
    if (studentId && bootcampRaw) {
      try {
        group = await pb.collection("groups").getFirstListItem(`bootcamp="${bootcampRaw.id}" && students~"${studentId}"`);
      } catch (err) {
        // no-op, student has no group assigned
      }
    }

    // 2) Pivot courses inside bootcamp
    const pivots = await pb.collection("bootcamp_courses").getFullList({
      filter: `bootcamp="${bootcampRaw.id}"`,
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
        coverImage: getFileUrl(c, c.coverImage ?? c.image),
        certificate: !!c.certificate,
        certifications: c.certifications ?? [],
      }))

    // 3) Modules for all courses
    const courseFilter = courses.map((c: any) => `course="${c.id}"`).join(" || ")
    let modules = courseFilter
      ? await pb.collection("course_modules").getFullList({
          filter: courseFilter,
          sort: "course,order",
        })
      : []

    modules = modules.map((m: any) => {
      let isModuleLocked = true;
      if (group) {
        if (Array.isArray(group.unlockedModules) && group.unlockedModules.includes(m.id)) isModuleLocked = false;
      }
      return { ...m, locked: isModuleLocked };
    })

    // 4) Lessons for all modules
    const moduleFilter = modules.map((m: any) => `module="${m.id}"`).join(" || ")
    let lessons = moduleFilter
      ? await pb.collection("course_lessons").getFullList({
          filter: moduleFilter,
          sort: "module,order",
        })
      : []

    lessons = lessons.map((l: any) => {
      let isLessonLocked = true;
      if (group) {
        if (Array.isArray(group.unlockedLessons) && group.unlockedLessons.includes(l.id)) isLessonLocked = false;
      }
      return { ...l, locked: isLessonLocked };
    })

    return NextResponse.json({ bootcamp, courses, modules, lessons })
  } catch (err: any) {
    if (err?.status === 404) {
      return NextResponse.json({ error: "Bootcamp not found" }, { status: 404 })
    }
    console.error("Error fetching bootcamp details:", err)
    return NextResponse.json(
      { error: "Failed to fetch bootcamp details" },
      { status: 500 }
    )
  }
}
