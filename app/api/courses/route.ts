import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

const pb = new PocketBase(process.env.POCKETBASE_URL!)

export async function GET() {
  try {
    const records = await pb.collection("courses").getFullList({
      filter: "isPublished = true",
      sort: "-created",
    })

    const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? process.env.POCKETBASE_URL

    const courses = records.map((c: any) => ({
      id: c.id,
      title: c.title,
      shortDescription: c.shortDescription,
      durationLabel: c.durationLabel,
      tags: Array.isArray(c.tags) ? c.tags : [],
      coverImage: c.coverImage
  ? `${PB_URL}/api/files/courses/${c.id}/${c.coverImage}`
  : null,
    }))

    return NextResponse.json({ courses })
  } catch (err) {
    console.error("COURSES API ERROR:", err)
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}
