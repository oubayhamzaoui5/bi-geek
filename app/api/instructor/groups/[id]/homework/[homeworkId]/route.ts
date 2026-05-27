import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

function fileUrl(col: string, id: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${col}/${id}/${filename}`
}

async function safeList(pb: any, col: string, filter: string, sort = "created") {
  try { return await pb.collection(col).getFullList({ filter, sort }) } catch { return [] }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; homeworkId: string }> }
) {
  try {
    const { id: groupId, homeworkId } = await params
    const pb = await getAdminPb()

    let hw: any
    try { hw = await pb.collection("homework").getOne(homeworkId) }
    catch { return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 }) }

    const attachments = await safeList(pb, "homework_attachments", `homework_id = "${homeworkId}"`)

    // group info for breadcrumb + student list
    let group: any = null
    try {
      group = await pb.collection("groups").getOne(groupId, { expand: "instructor" })
    } catch {}

    // all homework in group for sidebar nav
    const allHomework = await safeList(pb, "homework", `group_id = "${groupId}"`, "created")

    // all submissions for this homework
    const submissions = await safeList(pb, "homework_submissions", `homework_id = "${homeworkId}"`)

    // submission files for all submissions
    let subFiles: any[] = []
    if (submissions.length > 0) {
      const filter = submissions.map((s: any) => `submission_id = "${s.id}"`).join(" || ")
      subFiles = await safeList(pb, "homework_submission_files", filter)
    }

    // student details from group
    const studentIds: string[] = group ? (Array.isArray(group.students) ? group.students : []) : []
    let students: any[] = []
    if (studentIds.length > 0) {
      try {
        students = await pb.collection("users").getFullList({
          filter: studentIds.map(id => `id = "${id}"`).join(" || "),
        })
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      homework: {
        id: hw.id,
        moduleId: hw.module_id || "",
        groupId: hw.group_id || "",
        title: hw.title || "",
        text: hw.text || "",
        deadline: hw.deadline || null,
        attachments: attachments.map((a: any) => ({
          id: a.id,
          name: a.name || a.file || "",
          url: a.file ? fileUrl("homework_attachments", a.id, a.file) : null,
        })),
      },
      group: group
        ? {
            id: group.id,
            title: group.title || "",
            instructor: group.expand?.instructor
              ? {
                  name: group.expand.instructor.name || "",
                  surname: group.expand.instructor.surname || "",
                }
              : null,
          }
        : null,
      allHomework: allHomework.map((h: any) => ({
        id: h.id,
        moduleId: h.module_id || "",
        title: h.title || "",
        deadline: h.deadline || null,
      })),
      submissions: submissions.map((s: any) => {
        const student = students.find((u: any) => u.id === s.student_id)
        return {
          id: s.id,
          studentId: s.student_id,
          submittedAt: s.submitted_at || s.created || "",
          student: student
            ? {
                id: student.id,
                name: student.name || "",
                surname: student.surname || "",
                username: student.username || "",
                email: student.email || "",
              }
            : null,
          files: subFiles
            .filter((f: any) => f.submission_id === s.id)
            .map((f: any) => ({
              id: f.id,
              name: f.name || f.file || "",
              url: f.file ? fileUrl("homework_submission_files", f.id, f.file) : null,
            })),
        }
      }),
      studentIds,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
