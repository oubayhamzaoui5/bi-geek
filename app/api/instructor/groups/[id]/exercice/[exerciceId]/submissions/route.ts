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

async function safeList(pb: any, col: string, filter: string, sort = "") {
  try { return await pb.collection(col).getFullList({ filter, ...(sort ? { sort } : {}) }) } catch (e: any) {
    console.error(`[submissions] safeList error on "${col}" filter="${filter}":`, e?.message)
    return []
  }
}

function fileUrl(recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/exercise_submission_files/${recordId}/${filename}`
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; exerciceId: string }> }) {
  try {
    const { exerciceId } = await params
    console.log(`[submissions] querying for exerciceId="${exerciceId}"`)
    const pb = await getAdminPb()

    const submissions = await safeList(pb, "exercise_submissions", `exercise_id = "${exerciceId}"`, "-submitted_at")
    console.log(`[submissions] found ${submissions.length} submissions`)

    const result = await Promise.all(submissions.map(async (sub: any) => {
      const files = await safeList(pb, "exercise_submission_files", `submission_id = "${sub.id}"`)

      // Try to get student info
      let student: { id: string; name: string; surname: string; email: string; avatar: string | null } | null = null
      try {
        const u = await pb.collection("users").getOne(sub.student_id)
        student = {
          id: u.id,
          name: u.name || "",
          surname: u.surname || "",
          email: u.email || "",
          avatar: u.avatar ? `${PB_FILE_URL}/api/files/users/${u.id}/${u.avatar}` : null,
        }
      } catch {}

      return {
        id: sub.id,
        studentId: sub.student_id,
        student,
        submittedAt: sub.submitted_at || sub.created,
        files: files.map((f: any) => ({
          id: f.id,
          name: f.name || f.file || "",
          url: f.file ? fileUrl(f.id, f.file) : null,
        })),
      }
    }))

    return NextResponse.json({ ok: true, submissions: result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
