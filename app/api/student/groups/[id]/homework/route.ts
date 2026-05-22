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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const pb = await getAdminPb()

    let hwList: any[] = []
    try {
      hwList = await pb.collection("homework").getFullList({ filter: `group_id = "${groupId}"`, sort: "created" })
    } catch {
      try {
        const all = await pb.collection("homework").getFullList({ sort: "created" })
        hwList = all.filter((h: any) => h.group_id === groupId)
      } catch { hwList = [] }
    }

    let attachments: any[] = []
    if (hwList.length > 0) {
      const filter = hwList.map((h: any) => `homework_id = "${h.id}"`).join(" || ")
      attachments = await safeList(pb, "homework_attachments", filter)
    }

    let submissions: any[] = []
    let subFiles: any[] = []
    if (studentId && hwList.length > 0) {
      const hwFilter = hwList.map((h: any) => `homework_id = "${h.id}"`).join(" || ")
      submissions = await safeList(pb, "homework_submissions", `(${hwFilter}) && student_id = "${studentId}"`)

      if (submissions.length > 0) {
        const subFilter = submissions.map((s: any) => `submission_id = "${s.id}"`).join(" || ")
        subFiles = await safeList(pb, "homework_submission_files", subFilter)
      }
    }

    return NextResponse.json({
      ok: true,
      homework: hwList.map((h: any) => {
        const sub = submissions.find((s: any) => s.homework_id === h.id)
        return {
          id: h.id,
          moduleId: h.module_id || "",
          title: h.title || "",
          text: h.text || "",
          deadline: h.deadline || null,
          attachments: attachments
            .filter((a: any) => a.homework_id === h.id)
            .map((a: any) => ({
              id: a.id,
              name: a.name || a.file || "",
              url: a.file ? fileUrl("homework_attachments", a.id, a.file) : null,
            })),
          submission: sub
            ? {
                id: sub.id,
                submittedAt: sub.submitted_at || sub.created || "",
                files: subFiles
                  .filter((f: any) => f.submission_id === sub.id)
                  .map((f: any) => ({
                    id: f.id,
                    name: f.name || f.file || "",
                    url: f.file ? fileUrl("homework_submission_files", f.id, f.file) : null,
                  })),
              }
            : null,
        }
      }),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
