import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { sendPushToAdmins } from "@/lib/server-push"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      courseId,     // course enrollment
      bootcampId,   // bootcamp enrollment
      firstName,
      lastName,
      phone,
      birthDate,
      email,
      hasExperience,
      note,
    } = body ?? {}

    // ✅ Validate request early
    if ((!courseId && !bootcampId) || !firstName || !lastName || !phone || !birthDate) {
      return NextResponse.json(
        {
          error: "Missing required fields.",
          details: {
            courseId,
            bootcampId,
            firstName,
            lastName,
            phone,
            birthDate,
          },
        },
        { status: 400 },
      )
    }

    if (typeof hasExperience !== "boolean") {
      return NextResponse.json(
        { error: "hasExperience must be boolean." },
        { status: 400 },
      )
    }

    const PB_URL = process.env.POCKETBASE_URL
    const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
    const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

    if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return NextResponse.json(
        {
          error: "Missing PocketBase env vars.",
          details: {
            POCKETBASE_URL: !!PB_URL,
            POCKETBASE_ADMIN_EMAIL: !!ADMIN_EMAIL,
            POCKETBASE_ADMIN_PASSWORD: !!ADMIN_PASSWORD,
          },
        },
        { status: 500 },
      )
    }

    const pb = new PocketBase(PB_URL)

    // Admin login
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)

    // ✅ Create enrollment (either course OR bootcamp)
    const created = await pb.collection("enrollments").create({
      course: courseId || null,     // relation to "courses" collection
      bootcamp: bootcampId || null, // relation to "bootcamps" collection
      firstName,
      lastName,
      phone,
      birthDate, // "YYYY-MM-DD"
      email: email || "",
      hasExperience,
      note: note || "",
    })

    const programTitle = await resolveProgramTitle(pb, courseId, bootcampId)
    await sendPushToAdmins(pb, {
      title: "Nouvelle inscription",
      body: `${firstName} ${lastName} - ${programTitle}`,
      url: `/admin-mobile/enrollments?focus=${created.id}`,
      tag: `enrollment-${created.id}`,
      requireInteraction: true,
    }).catch((err) => {
      console.error("ADMIN PUSH ERROR:", err)
    })

    return NextResponse.json({ ok: true, id: created.id })
  } catch (err: any) {
    console.error("ENROLL API ERROR:", err)

    const pbMessage = err?.data?.message || err?.message || "Server error"
    const pbDetails = err?.data || null

    return NextResponse.json(
      { error: pbMessage, details: pbDetails },
      { status: 500 },
    )
  }
}

async function resolveProgramTitle(pb: PocketBase, courseId?: string, bootcampId?: string) {
  try {
    if (courseId) {
      const course = await pb.collection("courses").getOne(courseId, { fields: "title" })
      return course.title || "formation"
    }
    if (bootcampId) {
      const bootcamp = await pb.collection("bootcamps").getOne(bootcampId, { fields: "title" })
      return bootcamp.title || "bootcamp"
    }
  } catch {}

  return "formation"
}
