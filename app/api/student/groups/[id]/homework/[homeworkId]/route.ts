import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

export const dynamic = "force-dynamic"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

function fileUrl(col: string, id: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${col}/${id}/${filename}`
}

async function safeList(pb: any, col: string, filter: string, sort = "created") {
  try { return await pb.collection(col).getFullList({ filter, sort }) } catch { return [] }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; homeworkId: string }> }
) {
  try {
    const { id: groupId, homeworkId } = await params
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const pb = await getAdminPb()

    let hw: any
    try { hw = await pb.collection("homework").getOne(homeworkId) }
    catch { return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 }) }

    const attachments = await safeList(pb, "homework_attachments", `homework_id = "${homeworkId}"`)

    // group info for breadcrumb
    let group: any = null
    try {
      group = await pb.collection("groups").getOne(groupId, { expand: "instructor" })
    } catch {}

    // all homework in this group for sidebar nav
    const allHomework = await safeList(pb, "homework", `group_id = "${groupId}"`, "created")

    let submission: any = null
    let subFiles: any[] = []
    if (studentId) {
      const subs = await safeList(pb, "homework_submissions", `homework_id = "${homeworkId}" && student_id = "${studentId}"`)
      if (subs.length > 0) {
        submission = subs[0]
        subFiles = await safeList(pb, "homework_submission_files", `submission_id = "${submission.id}"`)
      }
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
        submission: submission
          ? {
              id: submission.id,
              submittedAt: submission.submitted_at || submission.created || "",
              files: subFiles.map((f: any) => ({
                id: f.id,
                name: f.name || f.file || "",
                url: f.file ? fileUrl("homework_submission_files", f.id, f.file) : null,
              })),
            }
          : null,
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
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
