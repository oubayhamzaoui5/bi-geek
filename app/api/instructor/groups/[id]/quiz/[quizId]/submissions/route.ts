import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

async function safeList(pb: any, col: string, filter: string, sort = "-created") {
  try {
    return await pb.collection(col).getFullList({ filter, sort })
  } catch (e: any) {
    console.error(`safeList ERROR col=${col} filter=${filter}:`, e.message, e.status)
    try {
      return await pb.collection(col).getFullList({ filter })
    } catch (e2: any) {
      console.error(`safeList FALLBACK ERROR col=${col}:`, e2.message)
      return []
    }
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const { quizId } = await params
    const pb = await getAdminPb()

    // Fetch all then filter in JS — PocketBase = filter on this collection returns 0 due to SDK bug
    const allSubs = await safeList(pb, "quiz_submissions", `quiz_id != ""`)
    console.log("SUBS allSubs:", allSubs.length, allSubs.map((s:any)=>({id:s.id,quiz_id:s.quiz_id})))
    console.log("SUBS quizId param:", quizId)
    const subs = allSubs.filter((s: any) => s.quiz_id === quizId)
    console.log("SUBS filtered:", subs.length)

    // Sequential — PocketBase JS SDK mutable authStore races under Promise.all
    const submissions = []
    for (const sub of subs) {
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

      submissions.push({
        id: sub.id,
        studentId: sub.student_id,
        student,
        score: sub.score ?? 0,
        total: sub.total ?? 0,
        answersJson,
        submittedAt: sub.submitted_at || sub.created,
      })
    }

    return NextResponse.json({ ok: true, submissions })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
