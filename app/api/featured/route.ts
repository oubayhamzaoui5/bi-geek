import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

const PB_URL = process.env.POCKETBASE_URL!

export async function GET() {
  try {
    const pb = new PocketBase(PB_URL)

    // 1️⃣ Get featured items ordered
    const featuredItems = await pb
      .collection("featured_items")
      .getFullList({ sort: "order" })

    // 2️⃣ Separate by type
    const courseIds = featuredItems
      .filter((item: any) => item.type === "course")
      .map((item: any) => item.itemId)

    const bootcampIds = featuredItems
      .filter((item: any) => item.type === "bootcamp")
      .map((item: any) => item.itemId)

    // 3️⃣ Fetch referenced records
    const [courses, bootcamps] = await Promise.all([
      courseIds.length
        ? pb.collection("courses").getFullList({
            filter: courseIds.map((id) => `id="${id}"`).join(" || "),
          })
        : [],
      bootcampIds.length
        ? pb.collection("bootcamps").getFullList({
            filter: bootcampIds.map((id) => `id="${id}"`).join(" || "),
          })
        : [],
    ])

    return NextResponse.json({
      ok: true,
      courses,
      bootcamps,
    })
  } catch (err: any) {
    console.error("PUBLIC FEATURED ERROR:", err)
    return NextResponse.json(
      { error: err?.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
