// app/api/admin/courses/route.ts
import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

// ---------------- TYPES ----------------

type IncomingLesson = {
  title: string
  durationLabel?: string
  order?: number
}

type IncomingModule = {
  title: string
  durationLabel?: string
  order?: number
  lessons?: IncomingLesson[]
}

type CertificationItem = {
  title: string
  issuer?: string
  description?: string
}

// ---------------- POCKETBASE ----------------

async function getAdminPb() {
  const PB_URL = process.env.POCKETBASE_URL
  const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

  if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Missing PocketBase environment variables.")
  }

  const pb = new PocketBase(PB_URL)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  return pb
}

// ---------------- GET (unchanged) ----------------
// keep your GET from previous step

// ---------------- POST ----------------

export async function POST(req: Request) {

  
  try {
    const pb = await getAdminPb()

    const formData = await req.formData()

    

    const id = formData.get("id")?.toString()

    const title = formData.get("title")?.toString() || ""
    const shortDescription = formData.get("shortDescription")?.toString() || ""
    const longDescription =
      formData.get("longDescription")?.toString() || ""
    const durationLabel = formData.get("durationLabel")?.toString() || ""
    const prerequis = formData.get("prerequis")?.toString() as
      | "Aucun"
      | "Contacter l'administration"

    const certificate = formData.get("certificate") === "true"

    const certifications: CertificationItem[] = JSON.parse(
      (formData.get("certifications")?.toString() as string) || "[]",
    )

    const modules: IncomingModule[] = JSON.parse(
      (formData.get("modules")?.toString() as string) || "[]",
    )

    const whatYouWillLearn: string[] = JSON.parse(
      (formData.get("whatYouWillLearn")?.toString() as string) || "[]",
    )

    const tags: string[] = JSON.parse(
      (formData.get("tags")?.toString() as string) || "[]",
    )

    const rating = Number(formData.get("rating") ?? 4.8)
    const reviewsCount = Number(formData.get("reviewsCount") ?? 0)

    if (!title || !shortDescription || !durationLabel || !prerequis) {
      return NextResponse.json(
        {
          error:
            "title, shortDescription, durationLabel, prerequis are required.",
        },
        { status: 400 },
      )
    }

    const finalCertifications =
      certificate === false ? [] : certifications

    if (certificate === true && finalCertifications.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one certification is required when certificate is enabled.",
        },
        { status: 400 },
      )
    }

    // ---------- COURSE PAYLOAD ----------
    const payload: any = {
      title,
      shortDescription,
      longDescription: longDescription || shortDescription,
      durationLabel,
      prerequis,
      certificate,
      certifications: finalCertifications,
      rating,
      reviewsCount,
      whatYouWillLearn,
      tags,
      isPublished: true,
    }

    // ---------- COVER IMAGE ----------
    const coverImage = formData.get("coverImage")
    if (coverImage instanceof File && coverImage.size > 0) {
      payload.coverImage = coverImage
    }

    // ---------- CREATE / UPDATE ----------
    const courseRecord = id
      ? await pb.collection("courses").update(id, payload)
      : await pb.collection("courses").create(payload)

    const courseId = courseRecord.id

    // ---------- SYNC MODULES & LESSONS ----------
    const existingModules = await pb
      .collection("course_modules")
      .getFullList({ filter: `course="${courseId}"` })

    const moduleIds = (existingModules as any[]).map((m) => m.id)

    if (moduleIds.length > 0) {
      const lessons = await pb.collection("course_lessons").getFullList({
        filter: moduleIds.map((id) => `module="${id}"`).join(" || "),
      })
      for (const l of lessons as any[]) {
        await pb.collection("course_lessons").delete(l.id)
      }
      for (const m of existingModules as any[]) {
        await pb.collection("course_modules").delete(m.id)
      }
    }

    for (let i = 0; i < modules.length; i++) {
      const m = modules[i]
      const createdModule = await pb.collection("course_modules").create({
        course: courseId,
        title: m.title || `Module ${i + 1}`,
        durationLabel: m.durationLabel ?? "",
        duration: m.durationLabel ?? "",
        order: m.order ?? i + 1,
      })

      for (let j = 0; j < (m.lessons ?? []).length; j++) {
        const l = m.lessons![j]
        await pb.collection("course_lessons").create({
          course: courseId,
          module: createdModule.id,
          title: l.title || `Leçon ${j + 1}`,
          durationLabel: l.durationLabel ?? "",
          duration: l.durationLabel ?? "",
          order: l.order ?? j + 1,
        })
      }
    }

    return NextResponse.json({ ok: true, course: courseRecord })
  } catch (err: any) {
    console.error("ADMIN COURSES POST ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 },
    )
  }
}

