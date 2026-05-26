import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

export const dynamic = "force-dynamic"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

async function safeList(pb: any, col: string, filter: string, sort = "-created") {
  try { return await pb.collection(col).getFullList({ filter, sort }) } catch { return [] }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const { quizId } = await params
    const pb = await getAdminPb()

    const subs = await safeList(pb, "quiz_submissions", `quiz_id = "${quizId}"`)

    const submissions = await Promise.all(subs.map(async (sub: any) => {
      let student = null
      try {
        const u = await pb.collection("users").getOne(sub.student_id)
        student = {
          id: u.id,
          name: u.name || "",
          surname: u.surname || "",
          email: u.email || "",
          avatar: u.avatar ? `${process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL}/api/files/users/${u.id}/${u.avatar}` : null,
        }
      } catch {}

      let answersJson: Record<string, string[]> = {}
      try { answersJson = JSON.parse(sub.answers_json || "{}") } catch {}

      return {
        id: sub.id,
        studentId: sub.student_id,
        student,
        score: sub.score ?? 0,
        total: sub.total ?? 0,
        answersJson,
        submittedAt: sub.submitted_at || sub.created,
      }
    }))

    return NextResponse.json({ ok: true, submissions })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
