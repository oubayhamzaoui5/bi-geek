import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { isAiEnabled } from "@/lib/ai/config"
import { askClaudeCode } from "@/lib/ai/claudeCodeBridge"
import { extractAndParseStrictJson } from "@/lib/ai/validator"
import type { LearningContext, StudentLevel } from "@/lib/ai/types"

type PracticeAction =
  | "generate_quiz"
  | "grade_quiz"
  | "generate_code_exercises"
  | "grade_code_exercises"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  try {
    await (pb as any).collection("_superusers").authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!,
    )
  } catch {
    await (pb as any).admins?.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!,
    )
  }
  return pb
}

function getAiUsedLabel() {
  return "Claude"
}

async function generateJson(prompt: string) {
  const raw = await askClaudeCode([
    "You are a local in-app PDF learning engine powered by Claude.",
    "Do not inspect files. Do not use tools. Use only the supplied learning context and user submissions.",
    "Return strict JSON only. No markdown fences.",
    "",
    prompt,
  ].join("\n"), 240_000)
  return extractAndParseStrictJson(raw)
}

function baseContextBlock(context: LearningContext, studentLevel: StudentLevel) {
  return [
    `Student level: ${studentLevel}`,
    "Learning context JSON:",
    JSON.stringify(context),
  ].join("\n\n")
}

function buildPrompt(action: PracticeAction, context: LearningContext, body: any) {
  const studentLevel = (body.studentLevel ?? "intermediate") as StudentLevel
  const contextBlock = baseContextBlock(context, studentLevel)

  if (action === "generate_quiz") {
    const questionCount = Math.max(3, Math.min(12, Number(body.questionCount ?? 9)))
    const mixedFormats = body.formats === "mixed" || body.quizStyle === "mixed"
    if (mixedFormats) {
      return [
        "Generate an adaptive mixed-format quiz from this PDF context.",
        "Return JSON with keys: title, instructions, questions.",
        "questions: array of objects {id, type, concept, difficulty, question, options, correctOptionIndexes, correctAnswer, acceptedAnswers, explanation}.",
        "type must be one of: multiple_choice, true_false, short_answer, fill_blank.",
        "For multiple_choice, include exactly 4 options and correctOptionIndexes as 0-based indexes.",
        "For true_false, include options [\"Vrai\", \"Faux\"] and correctAnswer as \"true\" or \"false\".",
        "For short_answer and fill_blank, include acceptedAnswers with 2-4 concise valid answers.",
        "Mix formats and difficulty: easy, medium, hard. Prefer practical BI/data scenarios over memory checks.",
        `Generate exactly ${questionCount} questions.`,
        "Use French.",
        "",
        contextBlock,
      ].join("\n")
    }

    return [
      "Generate an adaptive quiz from this PDF context.",
      "Return JSON with keys: title, instructions, questions.",
      "questions: array of objects {id, concept, difficulty, question, options, correctOptionIndexes, explanation}.",
      "Use exactly 4 options per question. correctOptionIndexes uses 0-based indexes.",
      "Mix difficulty: easy, medium, hard. Prefer practical BI/data scenarios over memory checks.",
      `Generate exactly ${questionCount} questions.`,
      "",
      contextBlock,
    ].join("\n")
  }

  if (action === "grade_quiz") {
    return [
      "Grade this quiz attempt and diagnose weak areas.",
      "Return JSON with keys: scoreSummary, totalScore, maxScore, perQuestion, weakAreas, recommendations, practicePlan.",
      "perQuestion: [{id, isCorrect, feedback, concept, explanation}].",
      "weakAreas: [{concept, issue, recommendation}].",
      "practicePlan: ordered list of concrete study tasks.",
      "Be direct and useful. Use French.",
      "",
      contextBlock,
      "",
      "Quiz JSON:",
      JSON.stringify(body.quiz),
      "",
      "Student answers JSON:",
      JSON.stringify(body.answers),
    ].join("\n")
  }

  if (action === "generate_code_exercises") {
    return [
      "Generate code-completion exercises from this PDF context.",
      "Return JSON with keys: title, instructions, exercises.",
      "exercises must contain exactly 9 items: 3 easy, 3 medium, 3 hard.",
      "Each exercise object: {id, title, difficulty, concept, language, instructions, starterCode, expectedFocus, hints}.",
      "starterCode must include TODO markers and be completable by a student.",
      "Use languages/tools from the context when possible: Python, C, Java, SQL, DAX, Power Query M. If no coding topic exists, use a practical Python, C, or Java data-processing task grounded in the document.",
      "Do not include full solutions.",
      "",
      contextBlock,
    ].join("\n")
  }

  return [
    "Grade code-completion exercise submissions and diagnose weak areas.",
    "Return JSON with keys: scoreSummary, totalScore, maxScore, perExercise, weakAreas, recommendations, practicePlan.",
    "perExercise: [{id, score, maxScore, concept, isCorrect, feedback, whatStudentCodeDoes, whyWrong, missingConcepts, improvedSolution}].",
    "Score each exercise from 0 to 10. improvedSolution may include corrected code.",
    "For every submitted program in any language, decide if it is right or wrong for the exercise.",
    "If it is wrong, explain in French what the student's code currently does, then explain precisely why that behavior is wrong or incomplete for the requested task.",
    "If it is right, say why it satisfies the expected behavior and mention any small improvement separately.",
    "Support Python, C, Java, SQL, DAX, Power Query M, and other common programming languages.",
    "Be specific about syntax, logic, missing concepts, and next practice. Use French.",
    "",
    contextBlock,
    "",
    "Exercises JSON:",
    JSON.stringify(body.exercises),
    "",
    "Student submissions JSON:",
    JSON.stringify(body.submissions),
  ].join("\n")
}

export async function POST(req: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "Le service IA n'est pas configuré." }, { status: 503 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const action = body.action as PracticeAction
  const attachmentId = body.attachmentId as string
  if (!attachmentId || !action) {
    return NextResponse.json({ error: "attachmentId et action requis" }, { status: 400 })
  }

  try {
    const pb = await getAdminPb()
    const record = await pb
      .collection("ai_contexts")
      .getFirstListItem(`attachment_id="${attachmentId}"`)
      .catch(() => null)

    if (!record || record.status !== "ready" || !record.context_json) {
      return NextResponse.json({ error: "Aucun contexte IA disponible pour ce document." }, { status: 404 })
    }

    const context = record.context_json as LearningContext
    const data = await generateJson(buildPrompt(action, context, body))
    return NextResponse.json({ ok: true, aiUsed: getAiUsedLabel(), data })
  } catch (err: any) {
    console.error("AI PRACTICE ERROR:", err)
    return NextResponse.json(
      { error: err?.message ?? "Erreur lors de la génération de l'exercice." },
      { status: 500 },
    )
  }
}
