import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pb = await getAdminPb()
    const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

    const group = await pb.collection("groups").getOne(id, { expand: "instructor" })

    const programType = group.programType || (group.course ? "course" : group.bootcamp ? "bootcamp" : "course")
    const courseId = group.course || ""
    const bootcampId = group.bootcamp || ""

    let program: any = null

    if (programType === "course" && courseId) {
      try {
        const course = await pb.collection("courses").getOne(courseId)
        program = {
          id: course.id,
          type: "course",
          title: course.title || "",
          shortDescription: course.shortDescription || "",
          longDescription: course.longDescription || "",
          coverImage: course.coverImage
            ? `${PB_FILE_URL}/api/files/courses/${course.id}/${course.coverImage}`
            : null,
        }
      } catch {}
    } else if (programType === "bootcamp" && bootcampId) {
      try {
        const bootcamp = await pb.collection("bootcamps").getOne(bootcampId)
        program = {
          id: bootcamp.id,
          type: "bootcamp",
          title: bootcamp.title || "",
          shortDescription: bootcamp.shortDescription || "",
          longDescription: bootcamp.longDescription || "",
          coverImage: bootcamp.coverImage
            ? `${PB_FILE_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`
            : null,
        }
      } catch {}
    }

    const studentIds: string[] = Array.isArray(group.students) ? group.students : []
    let students: any[] = []
    if (studentIds.length > 0) {
      try {
        const filter = studentIds.map((sid: string) => `id = "${sid}"`).join(" || ")
        const usersRes = await pb.collection("users").getFullList({ filter })
        students = usersRes.map((u: any) => ({
          id: u.id,
          name: u.name || "",
          surname: u.surname || "",
          username: u.username || "",
          email: u.email || "",
          avatar: u.avatar
            ? `${PB_FILE_URL}/api/files/${u.collectionId}/${u.id}/${u.avatar}`
            : null,
        }))
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        title: group.title || "",
        status: group.status || "not_started",
        programType,
        courseId,
        bootcampId,
        instructorId: group.instructor || null,
        instructor: group.expand?.instructor
          ? {
              id: group.expand.instructor.id,
              name: group.expand.instructor.name || "",
              surname: group.expand.instructor.surname || "",
            }
          : null,
        studentIds,
        students,
        program,
        created: group.created,
      },
    })
  } catch (err: any) {
    console.error("INSTRUCTOR GROUP GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
