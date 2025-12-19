// app/api/admin/enrollments/route.ts
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

export async function GET() {
  try {
    const pb = await getAdminPb()

    const records = await pb.collection("enrollments").getFullList({
      sort: "-created",
      expand: "course,bootcamp",
    })

    const enrollments = (records as any[]).map((e) => {
      const course = e.expand?.course
      const bootcamp = e.expand?.bootcamp

      let courseTitle: string | undefined
      let bootcampTitle: string | undefined

      if (course) {
        courseTitle = Array.isArray(course) ? course[0]?.title : course.title
      }
      if (bootcamp) {
        bootcampTitle = Array.isArray(bootcamp) ? bootcamp[0]?.title : bootcamp.title
      }

      return {
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        phone: e.phone,
        email: e.email ?? "",
        birthDate: e.birthDate ?? "",
        hasExperience: !!e.hasExperience,
        note: e.note ?? "",
        created: e.created?.slice(0, 10) ?? "",
        courseTitle,
        bootcampTitle,
        status: e.status ?? "pending", // default
      }
    })

    return NextResponse.json({ ok: true, enrollments })
  } catch (err: any) {
    console.error("ADMIN ENROLLMENTS GET ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
