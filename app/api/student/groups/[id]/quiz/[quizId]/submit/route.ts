import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

export const dynamic = "force-dynamic"

/*
  PocketBase collections required:
  ─ quiz_submissions  fields: quiz_id(text), student_id(text), score(number), total(number), answers_json(text), submitted_at(text)
*/

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090")
  const email = process.env.POCKETBASE_ADMIN_EMAIL!
  const password = process.env.POCKETBASE_ADMIN_PASSWORD!
  try {
    await pb.collection("_superusers").authWithPassword(email, password)
  } catch {
    await (pb as any).admins.authWithPassword(email, password)
  }
  return pb
}

async function safeList(pb: any, col: string, filter: string) {
  try { return await pb.collection(col).getFullList({ filter }) } catch { return [] }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; quizId: string }> }) {
  try {
    const { quizId } = await params
    const url = new URL(req.url)
    const studentId = url.searchParams.get("studentId") || ""
    if (!studentId) return NextResponse.json({ ok: true, submission: null })

    const pb = await getAdminPb()
    const allSubs = await safeList(pb, "quiz_submissions", `quiz_id != ""`)
    const subs = allSubs.filter((s: any) => s.quiz_id === quizId && s.student_id === studentId)
    if (subs.length === 0) return NextResponse.json({ ok: true, submission: null })
    const sub = subs[0]
    let answersJson: Record<string, string[]> = {}
    try { answersJson = JSON.parse(sub.answers_json || "{}") } catch {}
    return NextResponse.json({
      ok: true,
      submission: {
        id: sub.id,
        score: sub.score,
        total: sub.total,
        submittedAt: sub.submitted_at || sub.created,
        answersJson,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; quizId: string }> }) {
  try {
    const { quizId } = await params
    const pb = await getAdminPb()
    const { studentId, score, total, answersJson } = await req.json()

    if (!studentId) return NextResponse.json({ ok: false, error: "studentId requis" }, { status: 400 })

    // Prevent duplicate submission — filter in JS due to PocketBase = filter SDK bug
    const allExisting = await safeList(pb, "quiz_submissions", `quiz_id != ""`)
    const existing = allExisting.filter((s: any) => s.quiz_id === quizId && s.student_id === studentId)
    if (existing.length > 0) {
      return NextResponse.json({
        ok: true,
        submission: { id: existing[0].id, score: existing[0].score, total: existing[0].total, submittedAt: existing[0].submitted_at || existing[0].created },
        alreadySubmitted: true,
      })
    }

    const sub = await pb.collection("quiz_submissions").create({
      quiz_id: quizId,
      student_id: studentId,
      score,
      total,
      answers_json: JSON.stringify(answersJson || {}),
      submitted_at: new Date().toISOString(),
    })
    return NextResponse.json({
      ok: true,
      submission: { id: sub.id, score: sub.score, total: sub.total, submittedAt: sub.submitted_at },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
