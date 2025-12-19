// app/api/admin/bootcamps/route.ts
import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

type IncomingBootcamp = {
  id?: string
  title: string
  shortDescription: string
  longDescription?: string
  durationLabel: string
  levelLabel: string
  certificate?: boolean
  rating?: number
  reviewsCount?: number
  isPublished?: boolean
  /**
   * Ordered list of course IDs in this bootcamp.
   * The index in this array is used as "order".
   */
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
      // sort also by bootcamp so we get a consistent ordering
      pb.collection("bootcamp_courses").getFullList({ sort: "bootcamp,order" }),
    ])

    const coursesByBootcamp = new Map<string, string[]>()

    for (const p of pivotRecords as any[]) {
      const arr = coursesByBootcamp.get(p.bootcamp) ?? []
      arr.push(p.course) // already in "order" thanks to sort above
      coursesByBootcamp.set(p.bootcamp, arr)
    }

    const bootcamps = (bootcampRecords as any[]).map((b) => ({
      id: b.id,
      title: b.title,
      shortDescription: b.shortDescription,
      longDescription: b.longDescription,
      durationLabel: b.durationLabel,
      levelLabel: b.levelLabel,
      certificate: !!b.certificate,
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
    const body = (await req.json().catch(() => ({}))) as IncomingBootcamp
    const {
      id,
      title,
      shortDescription,
      longDescription,
      durationLabel,
      levelLabel,
      certificate,
      rating,
      reviewsCount,
      isPublished,
      courseIds,
    } = body

    if (!title || !shortDescription || !durationLabel || !levelLabel) {
      return NextResponse.json(
        {
          error:
            "title, shortDescription, durationLabel, levelLabel sont requis pour le bootcamp.",
        },
        { status: 400 },
      )
    }

    const pb = await getAdminPb()

    const payload = {
      title,
      shortDescription,
      longDescription: longDescription || shortDescription,
      durationLabel,
      levelLabel,
      certificate: certificate ?? true,
      rating: rating ?? 4.8,
      reviewsCount: reviewsCount ?? 0,
      isPublished: isPublished ?? true,
    }

    let bootcampRecord: any
    if (id) {
      bootcampRecord = await pb.collection("bootcamps").update(id, payload)
    } else {
      bootcampRecord = await pb.collection("bootcamps").create(payload)
    }

    const bootcampId = bootcampRecord.id
    const desiredCourseIds = courseIds ?? []

    // sync bootcamp_courses pivots
    const existingPivots = await pb.collection("bootcamp_courses").getFullList({
      filter: `bootcamp="${bootcampId}"`,
    })

    for (const p of existingPivots as any[]) {
      await pb.collection("bootcamp_courses").delete(p.id)
    }

    for (let i = 0; i < desiredCourseIds.length; i++) {
      const courseId = desiredCourseIds[i]
      if (!courseId) continue

      await pb.collection("bootcamp_courses").create({
        bootcamp: bootcampId,
        course: courseId,
        order: i + 1, // 👈 order is index-based
      })
    }

    const bootcamp = {
      id: bootcampRecord.id,
      title: bootcampRecord.title,
      shortDescription: bootcampRecord.shortDescription,
      longDescription: bootcampRecord.longDescription,
      durationLabel: bootcampRecord.durationLabel,
      levelLabel: bootcampRecord.levelLabel,
      certificate: !!bootcampRecord.certificate,
      rating: bootcampRecord.rating ?? 4.8,
      reviewsCount: bootcampRecord.reviewsCount ?? 0,
      isPublished: !!bootcampRecord.isPublished,
      courseIds: desiredCourseIds,
    }

    return NextResponse.json({ ok: true, bootcamp })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMPS POST ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
