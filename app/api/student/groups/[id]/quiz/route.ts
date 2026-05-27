import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { authErrorResponse, requireUser } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

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

async function assertCanReadGroup(req: Request, pb: any, groupId: string) {
  const user = await requireUser(req, ["student", "admin", "admin_agent"])
  const group = await pb.collection("groups").getOne(groupId)
  const studentIds = Array.isArray(group.students) ? group.students : []
  if (user.role !== "admin" && user.role !== "admin_agent" && !studentIds.includes(user.id)) return false
  return true
}

function fileUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
}

async function safeList(pb: any, col: string, filter: string, sort = "+order") {
  try {
    return await pb.collection(col).getFullList({ filter, sort })
  } catch {
    try {
      return await pb.collection(col).getFullList({ filter })
    } catch {
      return []
    }
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()
    const canRead = await assertCanReadGroup(req, pb, groupId)
    if (!canRead) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 })

    const url = new URL(req.url)
    const quizId = url.searchParams.get("quizId")

    if (quizId) {
      const quiz = await pb.collection("quizzes").getOne(quizId)
      if (quiz.group_id !== groupId) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 })
      const questions = await safeList(pb, "quiz_questions", `quiz_id = "${quizId}"`)
      const questionsFull = []
      for (const q of questions) {
        const answers = await safeList(pb, "quiz_answers", `question_id = "${q.id}"`, "+order")
        questionsFull.push({
          id: q.id,
          text: q.text || "",
          imageUrl: q.image ? fileUrl("quiz_questions", q.id, q.image) : null,
          order: q.order || 0,
          answers: answers.map((a: any) => ({
            id: a.id,
            text: a.text || "",
            isCorrect: a.is_correct || false,
            order: a.order || 0,
          })),
        })
      }
      return NextResponse.json({
        ok: true,
        quiz: {
          id: quiz.id,
          moduleId: quiz.module_id || "",
          title: quiz.title || "",
          deadline: quiz.deadline || null,
          questions: questionsFull,
        },
      })
    }

    const quizzes = await safeList(pb, "quizzes", `group_id = "${groupId}"`, "created")
    const result = await Promise.all(quizzes.map(async (quiz: any) => {
      const questions = await safeList(pb, "quiz_questions", `quiz_id = "${quiz.id}"`)
      return {
        id: quiz.id,
        moduleId: quiz.module_id || "",
        title: quiz.title || "",
        deadline: quiz.deadline || null,
        questionsCount: questions.length,
      }
    }))

    return NextResponse.json({ ok: true, quizzes: result })
  } catch (err: any) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
