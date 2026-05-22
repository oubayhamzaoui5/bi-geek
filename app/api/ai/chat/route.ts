import { NextResponse } from "next/server"
import PocketBase from "pocketbase"
import { isAiEnabled } from "@/lib/ai/config"
import { askClaudeCode } from "@/lib/ai/claudeCodeBridge"
import { promptBuilder } from "@/lib/ai/promptBuilder"
import { extractAndParseStrictJson } from "@/lib/ai/validator"
import type { LearningContext, StudentLevel, TutorStepByStepResponse } from "@/lib/ai/types"

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

function normalizeTutorResponse(input: any): TutorStepByStepResponse {
  return {
    answer: String(input?.answer ?? ""),
    steps: Array.isArray(input?.steps) ? input.steps.map(String) : [],
    checks: Array.isArray(input?.checks) ? input.checks.map(String) : [],
    nextAction: input?.nextAction ? String(input.nextAction) : "",
    uncertaintyNote: input?.uncertaintyNote ? String(input.uncertaintyNote) : null,
    presentation: input?.presentation && typeof input.presentation === "object"
      ? input.presentation
      : null,
    suggestions: Array.isArray(input?.suggestions)
      ? input.suggestions.map(String).filter(Boolean).slice(0, 3)
      : [],
  }
}

function normalizeAnswerSuggestions(input: any): string[] {
  const suggestions = Array.isArray(input?.suggestions) ? input.suggestions : []
  return suggestions
    .map((suggestion: unknown) => String(suggestion ?? "").trim())
    .filter(Boolean)
    .slice(0, 3)
}

async function askClaudeTutor(input: {
  studentLevel: StudentLevel
  question: string
  context: LearningContext
}) {
  const { systemInstruction, prompt } = promptBuilder.tutor({
    studentLevel: input.studentLevel,
    studentQuestion: input.question,
    learningContext: input.context,
  })

  const raw = await askClaudeCode([
    "You are being used as a local in-app PDF tutor through Claude Code.",
    "Do not inspect files. Do not use tools. Answer only from the supplied PDF learning context.",
    "Ignore any coding-agent behavior unless the student explicitly asks for code explanation.",
    "Before answering, identify the exact main topic requested by the student.",
    "Answer that topic directly first. Use related examples only as support, not as the center of the response.",
    "If the question asks about broad Python types, explain type categories and purpose first; mention input/casting only as a short related nuance if useful.",
    "If the student asks for a summary, produce a detailed learning summary with clear sections, examples from the supplied context, key nuances/mistakes, and a short recap. Do not make it a short abstract.",
    "Return strict JSON only with keys: answer, steps, checks, nextAction, uncertaintyNote, presentation.",
    "presentation shape: { title, shortAnswer, badges, visualItems, diagramSteps, codeExample, takeaways }. Keep it compact and visual: chips, 2-4 flow steps, short code only if useful.",
    "",
    "SYSTEM INSTRUCTIONS:",
    systemInstruction,
    "",
    "REQUEST:",
    prompt,
  ].join("\n"))

  return normalizeTutorResponse(extractAndParseStrictJson(raw))
}

async function askClaudeAnswerSuggestions(input: {
  studentLevel: StudentLevel
  question: string
  answer: string
  context: LearningContext
}) {
  const raw = await askClaudeCode([
    "You are generating follow-up suggestions for a student using an in-app PDF tutor.",
    "Do not inspect files. Do not use tools. Use only the supplied question, answer, and PDF learning context.",
    "Generate exactly 3 short follow-up suggestions the student can click next.",
    "Each suggestion must be a direct student question or action in French, useful after the answer.",
    "Keep each suggestion under 85 characters.",
    "Do not include numbering, markdown, explanations, or duplicate ideas.",
    "Return strict JSON only with this shape: { \"suggestions\": [\"...\", \"...\", \"...\"] }.",
    "",
    `STUDENT LEVEL: ${input.studentLevel}`,
    "",
    "STUDENT QUESTION:",
    input.question,
    "",
    "AI ANSWER:",
    input.answer,
    "",
    "PDF LEARNING CONTEXT JSON:",
    JSON.stringify(input.context),
  ].join("\n"))

  return normalizeAnswerSuggestions(extractAndParseStrictJson(raw))
}

// POST /api/ai/chat
// Body: { attachmentId, question, studentLevel? }
// Returns AI tutor response grounded in the stored PDF context
export async function POST(req: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: "Le service IA n'est pas configuré sur ce serveur." },
      { status: 503 },
    )
  }

  let body: { attachmentId: string; question: string; studentLevel?: StudentLevel }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { attachmentId, question, studentLevel = "intermediate" } = body

  if (!attachmentId || !question?.trim()) {
    return NextResponse.json(
      { error: "attachmentId et question requis" },
      { status: 400 },
    )
  }

  try {
    const pb = await getAdminPb()

    const record = await pb
      .collection("ai_contexts")
      .getFirstListItem(`attachment_id="${attachmentId}"`)
      .catch(() => null)

    if (!record || record.status !== "ready" || !record.context_json) {
      return NextResponse.json(
        {
          error:
            record?.status === "pending"
              ? "Le contexte IA est en cours de génération. Veuillez patienter."
              : "Aucun contexte IA disponible pour ce document.",
        },
        { status: 404 },
      )
    }

    const context = record.context_json as LearningContext
    const response = await askClaudeTutor({
      studentLevel,
      question: question.trim(),
      context,
    })
    response.suggestions = await askClaudeAnswerSuggestions({
      studentLevel,
      question: question.trim(),
      answer: response.answer,
      context,
    })

    return NextResponse.json({ ok: true, aiUsed: getAiUsedLabel(), response })
  } catch (err: any) {
    console.error("AI CHAT ERROR:", err)
    return NextResponse.json(
      { error: err?.message ?? "Erreur lors de la génération de la réponse." },
      { status: 500 },
    )
  }
}
