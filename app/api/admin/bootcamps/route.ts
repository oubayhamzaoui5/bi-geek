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

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function generateUniqueSlug(pb: PocketBase, title: string) {
  const baseSlug = slugify(title)
  let slug = baseSlug
  let counter = 1

  while (true) {
    try {
      await pb.collection("bootcamps").getFirstListItem(`slug="${slug}"`)
      // slug exists → try next
      counter++
      slug = `${baseSlug}-${counter}`
    } catch {
      // slug not found → safe to use
      return slug
    }
  }
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

export async function GET(req: Request) {
  try {
    const pb = await getAdminPb()
    const { searchParams } = new URL(req.url)
    const archived = searchParams.get("archived") === "true"

    let bootcampRecords: any[]
    try {
      bootcampRecords = await pb.collection("bootcamps").getFullList({
        sort: "title",
        filter: archived ? "archived=true" : "archived!=true",
      })
    } catch {
      // archived field may not exist yet — return all (unarchived) records
      bootcampRecords = await pb.collection("bootcamps").getFullList({ sort: "title" })
      if (archived) return NextResponse.json({ ok: true, bootcamps: [] })
    }

    // 🔥 Fix missing slugs automatically
    for (const b of bootcampRecords as any[]) {
      if (!b.slug || b.slug.trim() === "") {
        const slug = await generateUniqueSlug(pb, b.title)
        await pb.collection("bootcamps").update(b.id, { slug })
        console.log(`Generated slug for bootcamp "${b.title}" → ${slug}`)
      }
    }

    // Fetch pivot records and all courses (for tags)
    const [pivotRecords, courseRecords] = await Promise.all([
      pb.collection("bootcamp_courses").getFullList({ sort: "bootcamp,order" }),
      pb.collection("courses").getFullList({ fields: "id,tags" }),
    ])

    const coursesByBootcamp = new Map<string, string[]>()
    for (const p of pivotRecords as any[]) {
      const arr = coursesByBootcamp.get(p.bootcamp) ?? []
      arr.push(p.course)
      coursesByBootcamp.set(p.bootcamp, arr)
    }

    // Build courseId → tags map
    const courseTagsMap = new Map<string, string[]>()
    for (const c of courseRecords as any[]) {
      const tags = Array.isArray(c.tags) ? c.tags : (c.tags ? (() => { try { return JSON.parse(c.tags) } catch { return [] } })() : [])
      courseTagsMap.set(c.id, tags)
    }

    const bootcamps = (bootcampRecords as any[]).map((b) => {
      const courseIds = coursesByBootcamp.get(b.id) ?? []
      // Aggregate unique tags from assigned courses
      const tags = Array.from(new Set(courseIds.flatMap(id => courseTagsMap.get(id) ?? [])))
      return {
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
        courseIds,
        tags,
        slug: b.slug || "",
      }
    })

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
      if (courseIdsStr) courseIds = JSON.parse(courseIdsStr)
    } catch (e) {
      courseIds = []
    }

    // Parse tags
    let tags: string[] = []
    try {
      const tagsStr = formData.get("tags")?.toString()
      if (tagsStr) tags = JSON.parse(tagsStr)
    } catch (e) {
      tags = []
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
      tags,
    }

    // Handle cover image
    const coverImage = formData.get("coverImage")
    if (coverImage instanceof File && coverImage.size > 0) {
      payload.coverImage = coverImage
    }

    // Create or update bootcamp
    let bootcampRecord: any

    if (id) {
      // Update → keep existing slug
      bootcampRecord = await pb.collection("bootcamps").update(id, payload)
    } else {
      // Create → generate slug once
      const slug = await generateUniqueSlug(pb, title)
      bootcampRecord = await pb.collection("bootcamps").create({ ...payload, slug })
    }

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
      tags: Array.isArray(bootcampRecord.tags) ? bootcampRecord.tags : tags,
      slug: bootcampRecord.slug || "",
    }

    return NextResponse.json({ ok: true, bootcamp })
  } catch (err: any) {
    console.error("ADMIN BOOTCAMPS POST ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}