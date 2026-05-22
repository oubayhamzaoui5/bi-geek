import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

const PB_URL = process.env.POCKETBASE_URL!

type FeaturedType = "course" | "bootcamp"

function imageUrl(type: FeaturedType, record: any) {
  if (!record?.coverImage) return null
  if (typeof record.coverImage === "string" && record.coverImage.startsWith("http")) return record.coverImage
  return `${PB_URL}/api/files/${type === "course" ? "courses" : "bootcamps"}/${record.id}/${record.coverImage}`
}

function formatProgram(type: FeaturedType, record: any, order: number) {
  return {
    id: record.id,
    type,
    order,
    title: record.title || "",
    shortDescription: record.shortDescription || "",
    durationLabel: record.durationLabel || "",
    levelLabel: record.levelLabel || (type === "bootcamp" ? "Bootcamp" : "Tous niveaux"),
    tags: Array.isArray(record.tags) ? record.tags : [],
    slug: record.slug || record.id,
    coverImage: record.coverImage || null,
    image: imageUrl(type, record),
    rating: record.rating || 0,
    isPublished: record.isPublished ?? true,
  }
}

export async function GET() {
  try {
    const pb = new PocketBase(PB_URL)
    pb.autoCancellation(false)

    const featuredItems = await pb
      .collection("featured_items")
      .getFullList({ sort: "order" })

    const programs = []

    for (const item of featuredItems as any[]) {
      const type = item.type as FeaturedType
      if (type !== "course" && type !== "bootcamp") continue

      try {
        const record = await pb.collection(type === "course" ? "courses" : "bootcamps").getOne(item.itemId)
        if (record.isPublished === false) continue
        if (type === "bootcamp" && record.archived === true) continue
        programs.push(formatProgram(type, record, item.order || programs.length + 1))
      } catch (err) {
        console.warn("PUBLIC FEATURED ITEM SKIPPED:", item.itemId, err)
      }
    }

    programs.sort((a, b) => a.order - b.order)

    return NextResponse.json({
      ok: true,
      programs: programs.slice(0, 3),
      courses: programs.filter((p) => p.type === "course"),
      bootcamps: programs.filter((p) => p.type === "bootcamp"),
    })
  } catch (err: any) {
    console.error("PUBLIC FEATURED ERROR:", err)
    return NextResponse.json(
      { ok: false, error: err?.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
