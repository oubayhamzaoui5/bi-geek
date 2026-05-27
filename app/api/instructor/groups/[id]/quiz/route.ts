import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"
import { notifyGroupStudents } from "@/lib/notify-group-activity"

export const dynamic = "force-dynamic"

/*
  PocketBase collections required:
  ─ quizzes          fields: group_id(text), module_id(text), title(text)
  ─ quiz_questions   fields: quiz_id(text), text(text), image(file), order(number)
  ─ quiz_answers     fields: question_id(text), text(text), is_correct(bool), order(number)
*/

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

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

async function pbPatchFile(pb: any, collection: string, recordId: string, fileField: string, file: File) {
  const form = new FormData()
  form.append(fileField, file)
  const pbUrl = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090"
  const res = await fetch(`${pbUrl}/api/collections/${collection}/records/${recordId}`, {
    method: "PATCH",
    headers: { Authorization: pb.authStore.token },
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || `PocketBase file upload error ${res.status}`)
  }
}

async function fileFromUrl(url: string, fallbackName: string) {
  const res = await fetch(url)
  if (!res.ok) return null
  const blob = await res.blob()
  const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || fallbackName)
  return new File([blob], filename, { type: blob.type || "application/octet-stream" })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    const url = new URL(_req.url)
    const quizId = url.searchParams.get("quizId")

    if (quizId) {
      // Single quiz with full questions/answers
      const quiz = await pb.collection("quizzes").getOne(quizId)
      const questions = await safeList(pb, "quiz_questions", `quiz_id = "${quizId}"`)
      // Sequential (not Promise.all) — PocketBase JS SDK has mutable authStore;
      // concurrent getFullList calls race on it and all but the last silently return [].
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

    const quizList: any[] = await safeList(pb, "quizzes", `group_id = "${groupId}"`, "created")

    const result = await Promise.all(quizList.map(async quiz => {
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
  } catch (e: any) {
    console.error("QUIZ ERROR:", e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    const fd = await req.formData()
    const moduleId = fd.get("moduleId") as string || ""
    const title = fd.get("title") as string || ""
    const deadline = fd.get("deadline") as string || null
    const questionsRaw = fd.get("questions") as string
    const questionsMeta: {
      id: string; text: string; order: number; hasImage: boolean
      answers: { id: string; text: string; isCorrect: boolean; order: number }[]
    }[] = JSON.parse(questionsRaw)

    // Create quiz record
    const quiz = await pb.collection("quizzes").create({
      group_id: groupId,
      module_id: moduleId,
      title,
      deadline: deadline || null,
    })

    // Create questions and answers
    for (const qMeta of questionsMeta) {
      const imageFile = fd.get(`img_${qMeta.id}`) as File | null
      const questionRecord = await pb.collection("quiz_questions").create({
        quiz_id: quiz.id, text: qMeta.text, order: qMeta.order,
      })
      const questionId = String(questionRecord.id)
      if (imageFile) await pbPatchFile(pb, "quiz_questions", questionId, "image", imageFile)
      for (const a of qMeta.answers) {
        await pb.collection("quiz_answers").create({
          question_id: questionId, text: a.text, is_correct: a.isCorrect, order: a.order,
        })
      }
    }

    notifyGroupStudents(pb, groupId, { type: "quiz", title }).catch(() => {})

    return NextResponse.json({
      ok: true,
      quiz: {
        id: quiz.id,
        moduleId,
        title,
        questionsCount: questionsMeta.length,
      },
    })
  } catch (e: any) {
    console.error("QUIZ ERROR:", e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const pb = await getAdminPb()

    const fd = await req.formData()
    const quizId = fd.get("quizId") as string
    const title = fd.get("title") as string || ""
    const deadline = fd.get("deadline") as string || null
    const questionsRaw = fd.get("questions") as string
    const questionsMeta: {
      id: string; text: string; order: number; hasImage: boolean; imageUrl: string | null
      answers: { id: string; text: string; isCorrect: boolean; order: number }[]
    }[] = JSON.parse(questionsRaw)

    await pb.collection("quizzes").update(quizId, { title, deadline: deadline || null })

    // Preserve existing question images across edits when instructor does not re-upload them.
    const existingImageFiles = new Map<string, File>()
    await Promise.all(questionsMeta.map(async (qMeta) => {
      if (!qMeta.imageUrl) return
      const file = await fileFromUrl(qMeta.imageUrl, `quiz-question-${qMeta.id}.png`).catch(() => null)
      if (file) existingImageFiles.set(qMeta.id, file)
    }))

    // Delete old questions/answers and recreate
    const oldQs = await safeList(pb, "quiz_questions", `quiz_id = "${quizId}"`)
    for (const q of oldQs) {
      const oldAs = await safeList(pb, "quiz_answers", `question_id = "${q.id}"`)
      for (const a of oldAs) await pb.collection("quiz_answers").delete(a.id).catch(() => {})
      await pb.collection("quiz_questions").delete(q.id).catch(() => {})
    }

    for (const qMeta of questionsMeta) {
      const imageFile = fd.get(`img_${qMeta.id}`) as File | null
      const fileToUpload = imageFile || existingImageFiles.get(qMeta.id) || null
      const questionRecord = await pb.collection("quiz_questions").create({
        quiz_id: quizId, text: qMeta.text, order: qMeta.order,
      })
      const questionId = String(questionRecord.id)
      if (fileToUpload) await pbPatchFile(pb, "quiz_questions", questionId, "image", fileToUpload)
      for (const a of qMeta.answers) {
        await pb.collection("quiz_answers").create({ question_id: questionId, text: a.text, is_correct: a.isCorrect, order: a.order })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("QUIZ ERROR:", e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const { id } = await req.json()
    const pb = await getAdminPb()

    // Cascade: delete answers → questions → quiz
    const questions = await safeList(pb, "quiz_questions", `quiz_id = "${id}"`)
    for (const q of questions) {
      const answers = await safeList(pb, "quiz_answers", `question_id = "${q.id}"`)
      for (const a of answers) {
        await pb.collection("quiz_answers").delete(a.id).catch(() => {})
      }
      await pb.collection("quiz_questions").delete(q.id).catch(() => {})
    }
    await pb.collection("quizzes").delete(id)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("QUIZ ERROR:", e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
