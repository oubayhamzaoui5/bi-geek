import PocketBase from "pocketbase"
import { NextResponse } from "next/server"

type BootcampCard = {
  id: string
  title: string
  shortDescription?: string
  durationLabel?: string
  hours?: number
  steps: string[]
  tags: string[]
  coverImage?: string | null
}

export async function GET() {
  try {
    const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

    // 1) Fetch bootcamps
    const boots = await pb.collection("bootcamps").getFullList({
      filter: "isPublished = true",
      sort: "-created",
    })

    if (!boots.length) {
      return NextResponse.json({ bootcamps: [] })
    }

    // 2) Fetch pivot table bootcamp_courses with expanded course
    const filter = boots.map((b) => `bootcamp="${b.id}"`).join(" || ")
    const pivots = await pb.collection("bootcamp_courses").getFullList({
      filter,
      sort: "bootcamp,order",
      expand: "course",
    })

    // 3) Build steps and tags for each bootcamp
    const stepsMap = new Map<string, string[]>()
    const tagsMap = new Map<string, string[]>()

    for (const p of pivots) {
      const c = (p as any).expand?.course
      if (!c) continue

      // Steps (ordered)
      const stepsArr = stepsMap.get(p.bootcamp) ?? []
      stepsArr.push(c.title)
      stepsMap.set(p.bootcamp, stepsArr)

      // Tags from child course
      const rawTags = Array.isArray(c.tags) ? c.tags : []
      const tagArr = tagsMap.get(p.bootcamp) ?? []
      tagArr.push(...rawTags)
      tagsMap.set(p.bootcamp, tagArr)
    }

    // 4) Merge final bootcamp cards
    const bootcampCards: BootcampCard[] = boots.map((b) => {
      const rawTags = tagsMap.get(b.id) ?? []
      const m = new Map<string, string>()
      rawTags.forEach((t) => {
        const tag = (t ?? "").trim()
        if (!tag) return
        const key = tag.toLowerCase()
        if (!m.has(key)) m.set(key, tag)
      })

      return {
        ...b,
        steps: stepsMap.get(b.id) ?? [],
        tags: Array.from(m.values()),
        coverImage: b.coverImage
          ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/bootcamps/${b.id}/${b.coverImage}`
          : null,
      }
    })

    return NextResponse.json({ bootcamps: bootcampCards })
  } catch (err) {
    console.error("Error fetching bootcamps:", err)
    return NextResponse.json(
      { error: "Failed to fetch bootcamps" },
      { status: 500 }
    )
  }
}
