import { NextResponse } from "next/server"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import PocketBase from "pocketbase"
import { isAiEnabled } from "@/lib/ai/config"
import { askClaudeCode } from "@/lib/ai/claudeCodeBridge"
import { promptBuilder } from "@/lib/ai/promptBuilder"
import { extractAndParseStrictJson, isRetryableError, validateLearningContextJson } from "@/lib/ai/validator"

const MAX_CONTEXT_SOURCE_CHARS = 120_000

type NotionCard = { title: string; description: string }

const SUMMARY_SUGGESTION = "Fais-moi un résumé détaillé avec exemples"

function withSummarySuggestion(suggestions: unknown): string[] {
  const existing = Array.isArray(suggestions) ? suggestions.map(String) : []
  return [
    SUMMARY_SUGGESTION,
    ...existing.filter(s => s.trim().toLowerCase() !== SUMMARY_SUGGESTION.toLowerCase()),
  ].slice(0, 4)
}

function buildNotionCards(context: any): NotionCard[] {
  if (typeof context === "string") {
    try {
      context = JSON.parse(context)
    } catch {
      context = null
    }
  }

  const cards: NotionCard[] = []
  const seen = new Set<string>()

  function shortDescription(value: string) {
    const firstSentence = value
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)[0]
      .trim()

    const source = firstSentence || value.replace(/\s+/g, " ").trim()
    return source.length > 92 ? `${source.slice(0, 89).trim()}...` : source
  }

  function add(title: unknown, description: unknown) {
    const cleanTitle = String(title ?? "").trim()
    const cleanDescription = String(description ?? "").trim()
    if (!cleanTitle) return
    const key = cleanTitle.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    cards.push({
      title: cleanTitle,
      description: cleanDescription ? shortDescription(cleanDescription) : "Introduction courte du document.",
    })
  }

  for (const item of Array.isArray(context?.keyConcepts) ? context.keyConcepts : []) {
    add(item?.concept, item?.explanation)
  }
  for (const item of Array.isArray(context?.explanations) ? context.explanations : []) {
    add(item?.concept, item?.explanation)
  }
  for (const item of Array.isArray(context?.examples) ? context.examples : []) {
    add(item?.concept, item?.example)
  }
  for (const item of Array.isArray(context?.mistakes) ? context.mistakes : []) {
    add(item?.mistake, item?.correction || item?.whyItHappens)
  }

  return cards.slice(0, 8)
}

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  // PocketBase v0.22+ uses _superusers collection for admin auth
  try {
    await (pb as any).collection("_superusers").authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!,
    )
  } catch {
    // Fallback for older SDK versions
    await (pb as any).admins?.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!,
    )
  }
  return pb
}

// GET /api/ai/context?attachmentId=xxx
export async function GET(req: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json({ enabled: false, status: "disabled" })
  }

  const { searchParams } = new URL(req.url)
  const attachmentId = searchParams.get("attachmentId")
  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId requis" }, { status: 400 })
  }

  try {
    const pb = await getAdminPb()
    const record = await pb
      .collection("ai_contexts")
      .getFirstListItem(`attachment_id="${attachmentId}"`)
      .catch(() => null)

    if (!record) {
      return NextResponse.json({ enabled: true, status: "none" })
    }

    return NextResponse.json({
      enabled: true,
      status: record.status,
      suggestions: withSummarySuggestion(record.suggestions_json),
      notions: buildNotionCards(record.context_json),
      errorMsg: record.error_msg ?? null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/ai/context
// Body: { attachmentId, pdfUrl, lessonId?, groupId?, attachmentName? }
export async function POST(req: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json({ enabled: false }, { status: 200 })
  }

  let body: { attachmentId: string; pdfUrl: string; lessonId?: string; groupId?: string; attachmentName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { attachmentId, pdfUrl, lessonId, groupId, attachmentName } = body
  if (!attachmentId || !pdfUrl) {
    return NextResponse.json({ error: "attachmentId et pdfUrl requis" }, { status: 400 })
  }
  if (!isAllowedPdfUrl(pdfUrl)) {
    return NextResponse.json({ error: "URL PDF non autorisee." }, { status: 400 })
  }

  const pb = await getAdminPb()

  const existing = await pb
    .collection("ai_contexts")
    .getFirstListItem(`attachment_id="${attachmentId}"`)
    .catch(() => null)

  const pendingData = {
    attachment_id: attachmentId,
    attachment_name: attachmentName ?? "",
    lesson_id: lessonId ?? "",
    group_id: groupId ?? "",
    status: "pending",
    error_msg: "",
    context_json: null,
    suggestions_json: null,
  }

  let recordId: string
  if (existing) {
    await pb.collection("ai_contexts").update(existing.id, pendingData)
    recordId = existing.id
  } else {
    const created = await pb.collection("ai_contexts").create(pendingData)
    recordId = created.id
  }

  // Fire-and-forget: process the PDF in background
  processContextAsync(pb, recordId, pdfUrl).catch(() => {})

  return NextResponse.json({ ok: true, status: "pending", recordId })
}

const RETRY_DELAYS_MS = [15_000, 35_000, 60_000] // free-tier rate limit backoff

function normalizePdfText(text: string) {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function extractPdfText(pdfBuffer: ArrayBuffer) {
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs")
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).href

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  const pages: string[] = []
  let charCount = 0

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => String(item?.str ?? "").trim())
        .filter(Boolean)
        .join(" ")

      if (pageText) {
        const pageBlock = `Page ${pageNumber}:\n${pageText}`
        pages.push(pageBlock)
        charCount += pageBlock.length
      }

      page.cleanup?.()

      if (charCount >= MAX_CONTEXT_SOURCE_CHARS) break
    }
  } finally {
    await doc.destroy?.()
  }

  return normalizePdfText(pages.join("\n\n")).slice(0, MAX_CONTEXT_SOURCE_CHARS)
}

async function processContextAsync(pb: PocketBase, recordId: string, pdfUrl: string) {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      // Fetch PDF binary
      const pdfResponse = await fetch(pdfUrl)
      if (!pdfResponse.ok) {
        throw new Error(`Impossible de télécharger le PDF (status ${pdfResponse.status})`)
      }
      const pdfBuffer = await pdfResponse.arrayBuffer()
      const pdfText = await extractPdfText(pdfBuffer)
      if (!pdfText) {
        throw new Error("Impossible d'extraire le texte du PDF pour Claude.")
      }

      const { systemInstruction, prompt } = promptBuilder.context(pdfText)

      const raw = await askClaudeCode([
        "You are the Claude context engine for the BI Geek PDF tutor.",
        "Do not inspect files. Do not use tools. Use only the extracted PDF text below.",
        "Return strict JSON only. No markdown fences.",
        "",
        "SYSTEM INSTRUCTIONS:",
        systemInstruction,
        "",
        "REQUEST:",
        prompt,
      ].join("\n"), 240_000)

      const parsed = extractAndParseStrictJson(raw)
      const context = validateLearningContextJson(parsed)
      const suggestions = withSummarySuggestion(promptBuilder.suggestions(context))

      await pb.collection("ai_contexts").update(recordId, {
        status: "ready",
        context_json: context,
        suggestions_json: suggestions,
        error_msg: "",
      })
      return // success
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err))

      const shouldRetry = attempt < RETRY_DELAYS_MS.length && isRetryableError(lastError)
      if (!shouldRetry) break

      // Update record to show retry in progress
      await pb.collection("ai_contexts").update(recordId, {
        error_msg: `Tentative ${attempt + 1} échouée, nouvelle tentative dans ${RETRY_DELAYS_MS[attempt] / 1000}s…`,
      }).catch(() => {})

      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]))
    }
  }

  // All retries exhausted
  await pb.collection("ai_contexts").update(recordId, {
    status: "error",
    error_msg: lastError?.message ?? "Erreur lors de la génération du contexte IA",
  }).catch(() => {})
}

function isAllowedPdfUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    const pbUrl = new URL(process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")
    return (
      url.origin === pbUrl.origin &&
      url.pathname.startsWith("/api/files/") &&
      url.pathname.toLowerCase().endsWith(".pdf")
    )
  } catch {
    return false
  }
}
