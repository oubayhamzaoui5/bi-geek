import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const PB_URL = process.env.POCKETBASE_URL
  const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

  if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Variables d'environnement PocketBase manquantes.")
  }

  const pb = new PocketBase(PB_URL)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  return pb
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const pb = await getAdminPb()
    const bootcampId = params.id

    const pivots = await pb.collection("bootcamp_courses").getFullList({
      filter: `bootcamp="${bootcampId}"`,
      sort: "order",
      expand: "course",
    })

    const courses = pivots.map((p: any) => p.expand?.course).filter(Boolean)
    if (courses.length === 0) {
      return NextResponse.json({ ok: true, curriculum: { modules: [], lessons: [], courses: [] } })
    }

    const courseFilter = courses.map((c: any) => `course="${c.id}"`).join(" || ")
    
    let modules: any[] = []
    let lessons: any[] = []

    if (courseFilter) {
      modules = await pb.collection("course_modules").getFullList({
        filter: courseFilter,
      })
      
      const moduleFilter = modules.map(m => `module="${m.id}"`).join(" || ")
      if (moduleFilter) {
        // Pocketbase filters have a max length or complexity limit, but for a few modules it is fine
        try {
          lessons = await pb.collection("course_lessons").getFullList({
            filter: moduleFilter,
          })
        } catch (e) {
          // If the filter is too long, we might just have to fetch all and filter in memory
          lessons = await pb.collection("course_lessons").getFullList()
          lessons = lessons.filter(l => modules.some(m => m.id === l.module))
        }
      }
    }

    return NextResponse.json({
      ok: true,
      curriculum: {
        courses: courses.map((c: any) => ({
          id: c.id,
          title: c.title,
        })),
        modules: modules.map((m: any) => ({
          id: m.id,
          title: m.title,
          courseId: m.course,
          locked: !!m.locked,
        })),
        lessons: lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          moduleId: l.module,
          locked: !!l.locked,
        })),
      },
    })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMP CURRICULUM GET ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
