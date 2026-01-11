import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type IncomingBootcamp = {
  id?: string
  title: string
  shortDescription: string
  longDescription?: string
  durationLabel: string
  prerequis: "Aucun" | "Contacter l'administration"
  rating?: number
  reviewsCount?: number
  isPublished?: boolean
  courseIds?: string[]
}

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

    const [bootcampRecords, pivotRecords] = await Promise.all([
      pb.collection("bootcamps").getFullList({ sort: "title" }),
      pb.collection("bootcamp_courses").getFullList({ sort: "bootcamp,order" }),
    ])

    const coursesByBootcamp = new Map<string, string[]>()

    for (const p of pivotRecords as any[]) {
      const arr = coursesByBootcamp.get(p.bootcamp) ?? []
      arr.push(p.course)
      coursesByBootcamp.set(p.bootcamp, arr)
    }

    const bootcamps = (bootcampRecords as any[]).map((b) => ({
      id: b.id,
      title: b.title,
      shortDescription: b.shortDescription,
      longDescription: b.longDescription || "",
      durationLabel: b.durationLabel,
      prerequis: b.prerequis || "Aucun",
      coverImage: b.coverImage || null,
      rating: b.rating ?? 4.8,
      reviewsCount: b.reviewsCount ?? 0,
      isPublished: !!b.isPublished,
      courseIds: coursesByBootcamp.get(b.id) ?? [],
    }))

    return NextResponse.json({ ok: true, bootcamps })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMPS GET ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const pb = await getAdminPb()

    // Parse form data
    const id = formData.get("id")?.toString()
    const title = formData.get("title")?.toString() || ""
    const shortDescription = formData.get("shortDescription")?.toString() || ""
    const longDescription = formData.get("longDescription")?.toString() || ""
    const durationLabel = formData.get("durationLabel")?.toString() || ""
    const prerequis = (formData.get("prerequis")?.toString() || "Aucun") as "Aucun" | "Contacter l'administration"
    
    const rating = Number(formData.get("rating") ?? 4.8)
    const reviewsCount = Number(formData.get("reviewsCount") ?? 0)
    const isPublished = formData.get("isPublished") !== "false"

    // Parse courseIds from JSON string
    let courseIds: string[] = []
    try {
      const courseIdsStr = formData.get("courseIds")?.toString()
      if (courseIdsStr) {
        courseIds = JSON.parse(courseIdsStr)
      }
    } catch (e) {
      courseIds = []
    }

    // Validation
    if (!title || !shortDescription || !durationLabel || !prerequis) {
      return NextResponse.json(
        {
          error: "Le titre, la description courte, la durée et les prérequis sont obligatoires."
        },
        { status: 400 }
      )
    }

    // Prepare payload
    const payload: any = {
      title,
      shortDescription,
      longDescription: longDescription || shortDescription,
      durationLabel,
      prerequis,
      rating,
      reviewsCount,
      isPublished,
    }

    // Handle cover image
    const coverImage = formData.get("coverImage")
    if (coverImage instanceof File && coverImage.size > 0) {
      payload.coverImage = coverImage
    }

    // Create or update bootcamp
    const bootcampRecord = id
      ? await pb.collection("bootcamps").update(id, payload)
      : await pb.collection("bootcamps").create(payload)

    const bootcampId = bootcampRecord.id

    // Sync courses
    const existingPivots = await pb.collection("bootcamp_courses").getFullList({
      filter: `bootcamp="${bootcampId}"`,
    })

    // Delete old pivots
    for (const p of existingPivots as any[]) {
      await pb.collection("bootcamp_courses").delete(p.id)
    }

    // Create new pivots with order
    for (let i = 0; i < courseIds.length; i++) {
      const courseId = courseIds[i]
      if (!courseId) continue

      await pb.collection("bootcamp_courses").create({
        bootcamp: bootcampId,
        course: courseId,
        order: i + 1,
      })
    }

    const bootcamp = {
      id: bootcampRecord.id,
      title: bootcampRecord.title,
      shortDescription: bootcampRecord.shortDescription,
      longDescription: bootcampRecord.longDescription || "",
      durationLabel: bootcampRecord.durationLabel,
      prerequis: bootcampRecord.prerequis || "Aucun",
      coverImage: bootcampRecord.coverImage || null,
      rating: bootcampRecord.rating ?? 4.8,
      reviewsCount: bootcampRecord.reviewsCount ?? 0,
      isPublished: !!bootcampRecord.isPublished,
      courseIds,
    }

    return NextResponse.json({ ok: true, bootcamp })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMPS POST ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}