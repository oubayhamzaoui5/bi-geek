import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

export const dynamic = "force-dynamic"

/*
  PocketBase collections required:
  ─ exercise_submissions       fields: exercise_id(text), student_id(text), submitted_at(text)
  ─ exercise_submission_files  fields: submission_id(text), name(text), file(file)
*/

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

function fileUrl(recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/exercise_submission_files/${recordId}/${filename}`
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; exerciceId: string }> }) {
  try {
    const { exerciceId } = await params
    const url = new URL(req.url)
    const studentId = url.searchParams.get("studentId") || ""
    if (!studentId) return NextResponse.json({ ok: true, submission: null })

    const pb = await getAdminPb()
    const subs = await safeList(pb, "exercise_submissions", `exercise_id = "${exerciceId}" && student_id = "${studentId}"`)
    if (subs.length === 0) return NextResponse.json({ ok: true, submission: null })

    const sub = subs[0]
    const files = await safeList(pb, "exercise_submission_files", `submission_id = "${sub.id}"`)

    return NextResponse.json({
      ok: true,
      submission: {
        id: sub.id,
        submittedAt: sub.submitted_at || sub.created,
        files: files.map((f: any) => ({
          id: f.id,
          name: f.name || f.file || "",
          url: f.file ? fileUrl(f.id, f.file) : null,
        })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; exerciceId: string }> }) {
  try {
    const { exerciceId } = await params
    const pb = await getAdminPb()
    const formData = await req.formData()
    const studentId = formData.get("studentId") as string
    const fileEntries = formData.getAll("files") as File[]

    if (!studentId) return NextResponse.json({ ok: false, error: "studentId requis" }, { status: 400 })

    // Check exercise deadline
    let exercise: any
    try { exercise = await pb.collection("exercises").getOne(exerciceId) }
    catch { return NextResponse.json({ ok: false, error: "Exercice introuvable" }, { status: 404 }) }

    if (exercise.deadline && new Date(exercise.deadline) < new Date()) {
      return NextResponse.json({ ok: false, error: "La date limite est dépassée" }, { status: 400 })
    }

    // Prevent duplicate submission
    const existing = await safeList(pb, "exercise_submissions", `exercise_id = "${exerciceId}" && student_id = "${studentId}"`)
    if (existing.length > 0) {
      const sub = existing[0]
      const files = await safeList(pb, "exercise_submission_files", `submission_id = "${sub.id}"`)
      return NextResponse.json({
        ok: true,
        submission: {
          id: sub.id,
          submittedAt: sub.submitted_at || sub.created,
          files: files.map((f: any) => ({ id: f.id, name: f.name || f.file || "", url: f.file ? fileUrl(f.id, f.file) : null })),
        },
        alreadySubmitted: true,
      })
    }

    const submission = await pb.collection("exercise_submissions").create({
      exercise_id: exerciceId,
      student_id: studentId,
      submitted_at: new Date().toISOString(),
    })

    const uploadedFiles: any[] = []
    for (const file of fileEntries) {
      if (!file || file.size === 0) continue
      const fd = new FormData()
      fd.append("submission_id", submission.id)
      fd.append("name", file.name)
      fd.append("file", file)
      const rec = await pb.collection("exercise_submission_files").create(fd)
      uploadedFiles.push({
        id: rec.id,
        name: rec.name || file.name,
        url: fileUrl(rec.id, rec.file),
      })
    }

    return NextResponse.json({
      ok: true,
      submission: {
        id: submission.id,
        submittedAt: submission.submitted_at,
        files: uploadedFiles,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
