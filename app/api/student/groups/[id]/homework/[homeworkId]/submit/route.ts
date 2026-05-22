import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { assertSelfOrRole, authErrorResponse, requireUser } from "@/lib/server-auth"

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

async function safeList(pb: any, col: string, filter: string) {
  try { return await pb.collection(col).getFullList({ filter }) } catch { return [] }
}

function isDeadlinePassed(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// POST: create submission
export async function POST(req: Request, { params }: { params: Promise<{ id: string; homeworkId: string }> }) {
  try {
    const { id: groupId, homeworkId } = await params
    const pb = await getAdminPb()
    const formData = await req.formData()
    const studentId = formData.get("studentId") as string
    const files = formData.getAll("files") as File[]

    if (!studentId) return NextResponse.json({ error: "Student ID manquant" }, { status: 400 })
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    assertSelfOrRole(user, studentId)

    let hw: any
    try { hw = await pb.collection("homework").getOne(homeworkId) }
    catch { return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 }) }
    if (hw.group_id !== groupId) return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 })
    await assertStudentInGroup(pb, groupId, studentId)

    if (isDeadlinePassed(hw.deadline)) {
      return NextResponse.json({ error: "Le délai de soumission est dépassé" }, { status: 400 })
    }

    const existing = await safeList(pb, "homework_submissions", `homework_id = "${homeworkId}" && student_id = "${studentId}"`)
    if (existing.length > 0) {
      return NextResponse.json({ error: "Soumission déjà existante" }, { status: 409 })
    }

    const submission = await pb.collection("homework_submissions").create({
      homework_id: homeworkId,
      student_id: studentId,
      submitted_at: new Date().toISOString(),
    })

    const uploadedFiles: any[] = []
    for (const file of files) {
      if (!file || file.size === 0) continue
      const fd = new FormData()
      fd.append("submission_id", submission.id)
      fd.append("name", file.name)
      fd.append("file", file)
      const rec = await pb.collection("homework_submission_files").create(fd)
      uploadedFiles.push({
        id: rec.id,
        name: rec.name || file.name,
        url: `${PB_FILE_URL}/api/files/homework_submission_files/${rec.id}/${rec.file}`,
      })
    }

    return NextResponse.json({
      ok: true,
      submission: { id: submission.id, submittedAt: submission.submitted_at, files: uploadedFiles },
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// PATCH: update submission (add/remove files)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; homeworkId: string }> }) {
  try {
    const { id: groupId, homeworkId } = await params
    const pb = await getAdminPb()
    const formData = await req.formData()
    const studentId = formData.get("studentId") as string
    const files = formData.getAll("files") as File[]
    const deleteIdsRaw = formData.get("deleteFileIds") as string
    const deleteFileIds: string[] = deleteIdsRaw ? JSON.parse(deleteIdsRaw) : []

    if (!studentId) return NextResponse.json({ error: "Student ID manquant" }, { status: 400 })
    const user = await requireUser(req, ["student", "admin", "admin_agent"])
    assertSelfOrRole(user, studentId)

    let hw: any
    try { hw = await pb.collection("homework").getOne(homeworkId) }
    catch { return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 }) }
    if (hw.group_id !== groupId) return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 })
    await assertStudentInGroup(pb, groupId, studentId)

    if (isDeadlinePassed(hw.deadline)) {
      return NextResponse.json({ error: "Le délai de soumission est dépassé" }, { status: 400 })
    }

    const existing = await safeList(pb, "homework_submissions", `homework_id = "${homeworkId}" && student_id = "${studentId}"`)
    if (existing.length === 0) {
      return NextResponse.json({ error: "Soumission introuvable" }, { status: 404 })
    }
    const submission = existing[0]

    await pb.collection("homework_submissions").update(submission.id, {
      submitted_at: new Date().toISOString(),
    })

    for (const fileId of deleteFileIds) {
      try {
        const fileRecord = await pb.collection("homework_submission_files").getOne(fileId)
        if (fileRecord.submission_id === submission.id) {
          await pb.collection("homework_submission_files").delete(fileId)
        }
      } catch {}
    }

    for (const file of files) {
      if (!file || file.size === 0) continue
      const fd = new FormData()
      fd.append("submission_id", submission.id)
      fd.append("name", file.name)
      fd.append("file", file)
      await pb.collection("homework_submission_files").create(fd)
    }

    const remaining = await safeList(pb, "homework_submission_files", `submission_id = "${submission.id}"`)

    return NextResponse.json({
      ok: true,
      submission: {
        id: submission.id,
        submittedAt: new Date().toISOString(),
        files: remaining.map((f: any) => ({
          id: f.id,
          name: f.name || f.file || "",
          url: f.file ? `${PB_FILE_URL}/api/files/homework_submission_files/${f.id}/${f.file}` : null,
        })),
      },
    })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

async function assertStudentInGroup(pb: any, groupId: string, studentId: string) {
  const group = await pb.collection("groups").getOne(groupId)
  const students = Array.isArray(group.students) ? group.students : []
  if (!students.includes(studentId)) {
    throw new Error("Etudiant non inscrit dans ce groupe.")
  }
}
