"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ElementType, KeyboardEvent, ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Target,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSetDashboardLoading } from "@/components/dashboard-loading-context"

type GeekyMode = "practice" | "quiz" | "chat"
type Difficulty = "easy" | "medium" | "hard"
type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "fill_blank"

type NotionCard = { title: string; description: string }
type ContextState = {
  enabled?: boolean
  status?: string
  suggestions?: string[]
  notions?: NotionCard[]
  errorMsg?: string | null
}

type CodeExercise = {
  id: string
  title: string
  difficulty: Difficulty
  concept: string
  language: string
  instructions: string
  starterCode: string
  expectedFocus: string
  hints: string[]
}

type CodePractice = { title: string; instructions: string; exercises: CodeExercise[] }

type QuizQuestion = {
  id: string
  type?: QuestionType
  concept: string
  difficulty: Difficulty
  question: string
  options?: string[]
  correctOptionIndexes?: number[]
  correctAnswer?: string
  acceptedAnswers?: string[]
  explanation?: string
}

type QuizData = { title: string; instructions: string; questions: QuizQuestion[] }

type FeedbackReport = {
  scoreSummary: unknown
  totalScore?: number
  maxScore?: number
  perQuestion?: Array<{ id: string; isCorrect: boolean; feedback: string; concept?: string; explanation?: string }>
  perExercise?: Array<{
    id: string
    score: number
    maxScore: number
    concept?: unknown
    isCorrect?: boolean
    feedback: unknown
    whatStudentCodeDoes?: unknown
    whyWrong?: unknown
    missingConcepts?: unknown[]
    improvedSolution?: unknown
  }>
  weakAreas?: Array<{ concept?: unknown; issue?: unknown; recommendation?: unknown } | unknown>
  recommendations?: unknown[]
  practicePlan?: unknown[]
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  suggestions?: string[]
  aiUsed?: string
}

const difficultyLabel: Record<Difficulty, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
}

const questionTypeLabel: Record<QuestionType, string> = {
  multiple_choice: "QCM",
  true_false: "Vrai/Faux",
  short_answer: "Reponse courte",
  fill_blank: "Texte a completer",
}

const languageAliases: Record<string, string> = {
  py: "python",
  python: "python",
  c: "c",
  "c/c++": "c",
  cpp: "c",
  "c++": "c",
  java: "java",
  js: "javascript",
  javascript: "javascript",
  ts: "javascript",
  typescript: "javascript",
  sql: "sql",
  dax: "sql",
  m: "sql",
  "power query m": "sql",
}

const keywordSets: Record<string, Set<string>> = {
  python: new Set([
    "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
    "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
    "not", "or", "pass", "raise", "return", "try", "while", "with", "yield", "print", "range", "len", "str", "int",
    "float", "list", "dict", "set", "tuple",
  ]),
  c: new Set([
    "auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else", "enum", "extern",
    "float", "for", "goto", "if", "int", "long", "register", "return", "short", "signed", "sizeof", "static",
    "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while", "include", "printf", "scanf",
  ]),
  java: new Set([
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue",
    "default", "do", "double", "else", "enum", "extends", "final", "finally", "float", "for", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "new", "package", "private", "protected", "public",
    "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this", "throw", "throws", "try",
    "void", "while", "String", "System", "out", "println",
  ]),
  javascript: new Set([
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "new", "this", "async",
    "await", "import", "from", "export", "try", "catch", "finally", "throw", "true", "false", "null", "undefined",
  ]),
  sql: new Set([
    "select", "from", "where", "join", "left", "right", "inner", "outer", "group", "by", "order", "having", "insert",
    "update", "delete", "create", "table", "view", "as", "and", "or", "not", "null", "case", "when", "then", "else",
    "end", "let", "in", "each", "filter", "sum", "count", "average",
  ]),
}

function getInitialMode(value: string | null): GeekyMode {
  if (value === "quiz" || value === "chat") return value
  return "practice"
}

function normalizeLanguage(language: string | undefined) {
  const key = String(language ?? "").trim().toLowerCase()
  return languageAliases[key] ?? key.split(/\s+/)[0] ?? "text"
}

function colorForToken(type: string) {
  if (type === "keyword") return "text-fuchsia-300"
  if (type === "string") return "text-emerald-300"
  if (type === "comment") return "text-slate-500 italic"
  if (type === "number") return "text-amber-300"
  if (type === "function") return "text-sky-300"
  return "text-slate-100"
}

function tokenizeCodeLine(line: string, language: string): Array<{ text: string; type: string }> {
  const normalized = normalizeLanguage(language)
  const keywords = keywordSets[normalized] ?? keywordSets.javascript
  const tokens: Array<{ text: string; type: string }> = []
  const commentStart = normalized === "python" ? line.indexOf("#") : Math.min(...[line.indexOf("//"), line.indexOf("/*")].filter((i) => i >= 0))
  const codePart = commentStart >= 0 && commentStart !== Infinity ? line.slice(0, commentStart) : line
  const commentPart = commentStart >= 0 && commentStart !== Infinity ? line.slice(commentStart) : ""
  const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|\s+|.)/g

  for (const match of codePart.matchAll(regex)) {
    const text = match[0]
    let type = "plain"
    if (/^["']/.test(text)) type = "string"
    else if (/^\d/.test(text)) type = "number"
    else if (keywords.has(normalized === "sql" ? text.toLowerCase() : text)) type = "keyword"
    else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text) && codePart.slice((match.index ?? 0) + text.length).trimStart().startsWith("(")) type = "function"
    tokens.push({ text, type })
  }

  if (commentPart) tokens.push({ text: commentPart, type: "comment" })
  return tokens
}

function getQuestionType(question: QuizQuestion): QuestionType {
  if (question.type) return question.type
  if (question.options?.length) return "multiple_choice"
  return "short_answer"
}

function compactFileName(value: string) {
  const clean = value.trim()
  if (!clean) return "Document PDF"
  return clean.length > 72 ? `${clean.slice(0, 69)}...` : clean
}

function textFromAiValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value.map(textFromAiValue).filter(Boolean).join(" - ")
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const preferred = [
      record.text,
      record.title,
      record.focus,
      record.exercice,
      record.exercises,
      record.exercices,
      record.recommendation,
      record.description,
      record.summary,
    ].map(textFromAiValue).filter(Boolean)

    if (preferred.length) {
      const prefix = textFromAiValue(record.semaine ?? record.week)
      return [prefix, ...preferred].filter(Boolean).join(": ")
    }

    return Object.entries(record)
      .map(([key, entryValue]) => {
        const rendered = textFromAiValue(entryValue)
        return rendered ? `${key}: ${rendered}` : ""
      })
      .filter(Boolean)
      .join(" - ")
  }
  return String(value)
}

export default function GeekyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const attachmentId = searchParams.get("attachmentId") ?? ""
  const documentName = compactFileName(searchParams.get("name") ?? "")
  const [mode, setMode] = useState<GeekyMode>(() => getInitialMode(searchParams.get("mode")))
  const [context, setContext] = useState<ContextState | null>(null)
  const [contextLoading, setContextLoading] = useState(true)

  const [practice, setPractice] = useState<CodePractice | null>(null)
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({})
  const [visibleHints, setVisibleHints] = useState<Record<string, number>>({})
  const [practiceFeedback, setPracticeFeedback] = useState<FeedbackReport | null>(null)
  const [practiceAiUsed, setPracticeAiUsed] = useState("")

  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | number[]>>({})
  const [quizFeedback, setQuizFeedback] = useState<FeedbackReport | null>(null)
  const [quizAiUsed, setQuizAiUsed] = useState("")

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useSetDashboardLoading(contextLoading)

  const ready = context?.status === "ready"
  const notions = context?.notions ?? []
  const suggestions = context?.suggestions ?? []

  const setModeAndUrl = useCallback((nextMode: GeekyMode) => {
    setMode(nextMode)
    const params = new URLSearchParams(searchParams.toString())
    params.set("mode", nextMode)
    router.replace(`/student-dashboard/geeky?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    setMode(getInitialMode(searchParams.get("mode")))
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    async function loadContext() {
      if (!attachmentId) {
        setContextLoading(false)
        setContext({ status: "missing" })
        return
      }
      setContextLoading(true)
      try {
        const res = await fetch(`/api/ai/context?attachmentId=${encodeURIComponent(attachmentId)}`)
        const data = await res.json()
        if (!cancelled) setContext(data)
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Impossible de charger le contexte IA.")
      } finally {
        if (!cancelled) setContextLoading(false)
      }
    }
    loadContext()
    return () => {
      cancelled = true
    }
  }, [attachmentId])

  const callPractice = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (!attachmentId) return null
    setLoadingAction(action)
    setError(null)
    try {
      const res = await fetch("/api/ai/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, attachmentId, studentLevel: "intermediate", ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur IA")
      return data as { aiUsed: string; data: any }
    } catch (err: any) {
      setError(err?.message ?? "Erreur IA")
      return null
    } finally {
      setLoadingAction(null)
    }
  }, [attachmentId])

  const generatePractice = useCallback(async () => {
    const result = await callPractice("generate_code_exercises")
    if (!result) return
    const data = result.data as CodePractice
    setPractice(data)
    setPracticeAiUsed(result.aiUsed)
    setVisibleHints({})
    setCodeAnswers(Object.fromEntries((data.exercises ?? []).map((ex) => [ex.id, ex.starterCode ?? ""])))
    setPracticeFeedback(null)
  }, [callPractice])

  const generateQuiz = useCallback(async () => {
    const result = await callPractice("generate_quiz", { questionCount: 8, formats: "mixed" })
    if (!result) return
    setQuiz(result.data as QuizData)
    setQuizAiUsed(result.aiUsed)
    setQuizAnswers({})
    setQuizFeedback(null)
  }, [callPractice])

  useEffect(() => {
    if (!ready) return
    if (mode === "practice" && !practice && !loadingAction) void generatePractice()
    if (mode === "quiz" && !quiz && !loadingAction) void generateQuiz()
  }, [generatePractice, generateQuiz, loadingAction, mode, practice, quiz, ready])

  async function submitPractice() {
    if (!practice) return
    const submissions = practice.exercises.map((ex) => ({ exerciseId: ex.id, answer: codeAnswers[ex.id] ?? "" }))
    const result = await callPractice("grade_code_exercises", { exercises: practice.exercises, submissions })
    if (!result) return
    setPracticeFeedback(result.data as FeedbackReport)
    setPracticeAiUsed(result.aiUsed)
  }

  async function submitQuiz() {
    if (!quiz) return
    const answers = quiz.questions.map((question) => {
      const type = getQuestionType(question)
      const value = quizAnswers[question.id]
      return {
        questionId: question.id,
        type,
        selectedOptionIndexes: Array.isArray(value) ? value : [],
        textAnswer: typeof value === "string" ? value : "",
      }
    })
    const result = await callPractice("grade_quiz", { quiz, answers })
    if (!result) return
    setQuizFeedback(result.data as FeedbackReport)
    setQuizAiUsed(result.aiUsed)
  }

  async function sendChat(message = chatInput) {
    const question = message.trim()
    if (!question || !attachmentId || loadingAction === "chat") return
    setChatInput("")
    setError(null)
    setChatMessages((prev) => [...prev, { role: "user", content: question }])
    setLoadingAction("chat")
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId, question, studentLevel: "intermediate" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur IA")
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response?.answer ?? "",
          suggestions: data.response?.suggestions ?? [],
          aiUsed: data.aiUsed ?? "IA",
        },
      ])
    } catch (err: any) {
      setError(err?.message ?? "Erreur IA")
    } finally {
      setLoadingAction(null)
    }
  }

  function askHint(exercise: CodeExercise) {
    setModeAndUrl("chat")
    void sendChat([
      `Donne-moi un indice progressif pour cet exercice sans donner la solution complete.`,
      `Exercice: ${exercise.title}`,
      `Consigne: ${exercise.instructions}`,
      `Code actuel:\n${codeAnswers[exercise.id] ?? ""}`,
    ].join("\n\n"))
  }

  const activeFeedback = mode === "quiz" ? quizFeedback : practiceFeedback
  const pageSubtitle = useMemo(() => {
    if (!attachmentId) return "Ouvre cette page depuis un PDF pour activer Geeky."
    if (contextLoading) return "Preparation du contexte de cours..."
    if (!ready) return "Le contexte IA de ce PDF n'est pas encore pret."
    return "Espace de travail guide par le PDF: pratique, quiz et questions ciblees."
  }, [attachmentId, contextLoading, ready])

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-5 font-sans text-slate-950 md:px-8 md:py-7">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-fuchsia-200 hover:text-[var(--accent)]"
                aria-label="Retour"
              >
                <ArrowLeft size={17} />
              </button>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-100 bg-fuchsia-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent)]">
                    <Sparkles size={12} /> Geeky
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    <FileText size={12} /> PDF contextuel
                  </span>
                </div>
                <h1 className="truncate text-xl font-bold tracking-normal text-slate-950 md:text-2xl">
                  {documentName}
                </h1>
                <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-600">{pageSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <ModeButton active={mode === "practice"} icon={Code2} label="Practice" onClick={() => setModeAndUrl("practice")} />
              <ModeButton active={mode === "quiz"} icon={GraduationCap} label="Quiz" onClick={() => setModeAndUrl("quiz")} />
              <ModeButton active={mode === "chat"} icon={MessageSquare} label="Ask Geeky" onClick={() => setModeAndUrl("chat")} />
            </div>
          </div>

          <div className="grid gap-3 px-5 py-4 md:grid-cols-3">
            <ContextMetric icon={BookOpen} label="Concepts" value={notions.length || "-"} tone="indigo" />
            <ContextMetric icon={Target} label="Mode actif" value={mode === "practice" ? "Code" : mode === "quiz" ? "Quiz" : "Chat"} tone="amber" />
            <ContextMetric icon={CheckCircle2} label="Contexte" value={ready ? "Pret" : context?.status ?? "En attente"} tone="green" />
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
        ) : null}

        {!attachmentId || (!contextLoading && !ready) ? (
          <EmptyState
            title={!attachmentId ? "Aucun PDF selectionne" : "Contexte Geeky indisponible"}
            description={context?.errorMsg || "Retourne au PDF et attends que le contexte IA soit pret, puis relance Geeky."}
          />
        ) : (
          <main className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0">
              {mode === "practice" && (
                <PracticePanel
                  practice={practice}
                  answers={codeAnswers}
                  visibleHints={visibleHints}
                  loading={loadingAction}
                  aiUsed={practiceAiUsed}
                  onGenerate={generatePractice}
                  onSubmit={submitPractice}
                  onAnswerChange={(id, value) => setCodeAnswers((prev) => ({ ...prev, [id]: value }))}
                  onRevealHint={(id) => setVisibleHints((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))}
                  onAskHint={askHint}
                  feedback={practiceFeedback}
                />
              )}
              {mode === "quiz" && (
                <QuizPanel
                  quiz={quiz}
                  answers={quizAnswers}
                  loading={loadingAction}
                  aiUsed={quizAiUsed}
                  onGenerate={generateQuiz}
                  onSubmit={submitQuiz}
                  onAnswerChange={(id, value) => setQuizAnswers((prev) => ({ ...prev, [id]: value }))}
                  feedback={quizFeedback}
                />
              )}
              {mode === "chat" && (
                <ChatPanel
                  messages={chatMessages}
                  input={chatInput}
                  loading={loadingAction === "chat"}
                  suggestions={suggestions}
                  onInputChange={setChatInput}
                  onSend={() => void sendChat()}
                  onSuggestion={(suggestion) => void sendChat(suggestion)}
                />
              )}
            </section>

            <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
              <DocumentContext notions={notions} suggestions={suggestions} onAsk={(q) => {
                setModeAndUrl("chat")
                void sendChat(q)
              }} />
              <FeedbackSummary report={activeFeedback} />
            </aside>
          </main>
        )}
      </div>
    </div>
  )
}

function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
        active ? "bg-white text-[var(--accent)] shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
      }`}
    >
      <Icon size={16} />
      <span className="truncate">{label}</span>
    </button>
  )
}

function ContextMetric({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: string | number; tone: "indigo" | "amber" | "green" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <span className={`inline-flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-slate-950">{value}</p>
      </div>
    </div>
  )
}

function PracticePanel(props: {
  practice: CodePractice | null
  answers: Record<string, string>
  visibleHints: Record<string, number>
  loading: string | null
  aiUsed: string
  feedback: FeedbackReport | null
  onGenerate: () => void
  onSubmit: () => void
  onAnswerChange: (id: string, value: string) => void
  onRevealHint: (id: string) => void
  onAskHint: (exercise: CodeExercise) => void
}) {
  const busy = props.loading === "generate_code_exercises" || props.loading === "grade_code_exercises"
  return (
    <WorkspaceShell
      icon={Code2}
      title={props.practice?.title ?? "Practice code depuis le PDF"}
      description={props.practice?.instructions ?? "Geeky transforme le cours en exercices de code progressifs."}
      aiUsed={props.aiUsed}
      actionLabel={props.practice ? "Regenerer" : "Generer"}
      loading={props.loading === "generate_code_exercises"}
      onAction={props.onGenerate}
    >
      {!props.practice ? <LoadingBlock label={busy ? "Generation des exercices..." : "Pret a generer"} /> : (
        <div className="flex flex-col gap-4">
          {props.practice.exercises.map((exercise, index) => {
            const hintCount = Math.min(props.visibleHints[exercise.id] ?? 0, exercise.hints?.length ?? 0)
            return (
              <article key={exercise.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">#{index + 1}</span>
                      <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[11px] font-bold text-[var(--accent)]">{difficultyLabel[exercise.difficulty]}</span>
                      <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">{exercise.language}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-950">{exercise.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{exercise.instructions}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Focus: {exercise.expectedFocus}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => props.onRevealHint(exercise.id)} disabled={!exercise.hints?.length}>
                      <HelpCircle size={14} /> Indice
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => props.onAskHint(exercise)}>
                      <Bot size={14} /> Geeky
                    </Button>
                  </div>
                </div>
                {hintCount > 0 ? (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                    {exercise.hints.slice(0, hintCount).map((hint, i) => <p key={i} className="mb-1 last:mb-0">{hint}</p>)}
                  </div>
                ) : null}
                <CodeEditor
                  value={props.answers[exercise.id] ?? ""}
                  language={exercise.language}
                  onChange={(value) => props.onAnswerChange(exercise.id, value)}
                />
              </article>
            )
          })}
          <div className="flex justify-end">
            <Button type="button" onClick={props.onSubmit} disabled={busy} className="bg-[var(--accent)] text-white hover:opacity-90">
              {props.loading === "grade_code_exercises" ? <Loader2 className="animate-spin" size={16} /> : <GraduationCap size={16} />}
              Soumettre le code
            </Button>
          </div>
          <FeedbackDetails report={props.feedback} />
        </div>
      )}
    </WorkspaceShell>
  )
}

function QuizPanel(props: {
  quiz: QuizData | null
  answers: Record<string, string | number[]>
  loading: string | null
  aiUsed: string
  feedback: FeedbackReport | null
  onGenerate: () => void
  onSubmit: () => void
  onAnswerChange: (id: string, value: string | number[]) => void
}) {
  const busy = props.loading === "generate_quiz" || props.loading === "grade_quiz"
  const allAnswered = !!props.quiz?.questions.every((question) => {
    const value = props.answers[question.id]
    return Array.isArray(value) ? value.length > 0 : !!String(value ?? "").trim()
  })

  return (
    <WorkspaceShell
      icon={GraduationCap}
      title={props.quiz?.title ?? "Quiz adaptatif Geeky"}
      description={props.quiz?.instructions ?? "Questions mixtes pour verifier comprehension, application et vocabulaire."}
      aiUsed={props.aiUsed}
      actionLabel={props.quiz ? "Regenerer" : "Generer"}
      loading={props.loading === "generate_quiz"}
      onAction={props.onGenerate}
    >
      {!props.quiz ? <LoadingBlock label={busy ? "Generation du quiz..." : "Pret a generer"} /> : (
        <div className="flex flex-col gap-4">
          {props.quiz.questions.map((question, index) => {
            const type = getQuestionType(question)
            const selected = props.answers[question.id]
            return (
              <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">Question {index + 1}</span>
                  <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[11px] font-bold text-[var(--accent)]">{questionTypeLabel[type]}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{difficultyLabel[question.difficulty]}</span>
                </div>
                <h3 className="text-base font-bold leading-6 text-slate-950">{question.question}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{question.concept}</p>
                {type === "multiple_choice" || type === "true_false" ? (
                  <div className="mt-4 grid gap-2">
                    {(question.options ?? ["Vrai", "Faux"]).map((option, optionIndex) => {
                      const current = Array.isArray(selected) ? selected : []
                      const active = current.includes(optionIndex)
                      return (
                        <button
                          key={`${question.id}-${optionIndex}`}
                          type="button"
                          onClick={() => {
                            if (type === "true_false") {
                              props.onAnswerChange(question.id, [optionIndex])
                              return
                            }
                            const next = active ? current.filter((i) => i !== optionIndex) : [...current, optionIndex]
                            props.onAnswerChange(question.id, next.sort((a, b) => a - b))
                          }}
                          className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold leading-5 transition ${
                            active ? "border-fuchsia-200 bg-fuchsia-50 text-[var(--accent)]" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Textarea
                    value={typeof selected === "string" ? selected : ""}
                    onChange={(event) => props.onAnswerChange(question.id, event.target.value)}
                    placeholder={type === "fill_blank" ? "Complete la reponse..." : "Redige une reponse courte..."}
                    className="mt-4 min-h-28 rounded-xl border-slate-200 bg-slate-50"
                  />
                )}
              </article>
            )
          })}
          <div className="flex justify-end">
            <Button type="button" onClick={props.onSubmit} disabled={busy || !allAnswered} className="bg-[var(--accent)] text-white hover:opacity-90">
              {props.loading === "grade_quiz" ? <Loader2 className="animate-spin" size={16} /> : <Target size={16} />}
              Corriger le quiz
            </Button>
          </div>
          <FeedbackDetails report={props.feedback} />
        </div>
      )}
    </WorkspaceShell>
  )
}

function ChatPanel(props: {
  messages: ChatMessage[]
  input: string
  loading: boolean
  suggestions: string[]
  onInputChange: (value: string) => void
  onSend: () => void
  onSuggestion: (value: string) => void
}) {
  return (
    <WorkspaceShell icon={MessageSquare} title="Ask Geeky" description="Pose une question precise sur le PDF, une erreur, une notion ou un exemple." aiUsed="" actionLabel="" loading={false}>
      <div className="flex min-h-[620px] flex-col rounded-2xl border border-slate-200 bg-white">
        <div className="flex-1 space-y-4 overflow-auto p-4">
          {props.messages.length === 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {props.suggestions.slice(0, 4).map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => props.onSuggestion(suggestion)} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-bold leading-5 text-slate-800 transition hover:border-fuchsia-200 hover:bg-white hover:text-[var(--accent)]">
                  {suggestion}
                </button>
              ))}
            </div>
          ) : props.messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[var(--accent)] text-white" : "border border-slate-200 bg-slate-50 text-slate-800"}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.suggestions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => props.onSuggestion(suggestion)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {props.loading ? <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"><Loader2 className="animate-spin" size={15} /> Geeky reflechit...</div> : null}
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="flex gap-2">
            <Textarea
              value={props.input}
              onChange={(event) => props.onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  props.onSend()
                }
              }}
              placeholder="Demande une explication, un exemple, ou un indice..."
              className="max-h-36 min-h-12 resize-none rounded-xl border-slate-200"
            />
            <Button type="button" onClick={props.onSend} disabled={!props.input.trim() || props.loading} className="h-12 bg-[var(--accent)] text-white hover:opacity-90">
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  )
}

function CodeEditor({ value, language, onChange }: { value: string; language: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const highlightRef = useRef<HTMLDivElement | null>(null)
  const gutterRef = useRef<HTMLDivElement | null>(null)
  const normalizedLanguage = normalizeLanguage(language)
  const lines = value.split("\n")

  function updateValue(nextValue: string, nextSelection: number) {
    onChange(nextValue)
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.selectionStart = nextSelection
      textarea.selectionEnd = nextSelection
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    if (event.key === "Tab") {
      event.preventDefault()
      const indent = "    "
      updateValue(`${value.slice(0, start)}${indent}${value.slice(end)}`, start + indent.length)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const lineStart = value.lastIndexOf("\n", start - 1) + 1
      const currentLine = value.slice(lineStart, start)
      const baseIndent = currentLine.match(/^\s*/)?.[0] ?? ""
      const trimmed = currentLine.trimEnd()
      const extraIndent = normalizedLanguage === "python" && trimmed.endsWith(":") ? "    " : ""
      const insertion = `\n${baseIndent}${extraIndent}`
      updateValue(`${value.slice(0, start)}${insertion}${value.slice(end)}`, start + insertion.length)
      return
    }

    if (event.key === "Backspace" && start === end) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1
      const beforeCursor = value.slice(lineStart, start)
      if (/^(?: {4})+$/.test(beforeCursor)) {
        event.preventDefault()
        updateValue(`${value.slice(0, start - 4)}${value.slice(end)}`, start - 4)
      }
    }
  }

  function syncScroll() {
    const textarea = textareaRef.current
    if (!textarea) return
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop
      highlightRef.current.scrollLeft = textarea.scrollLeft
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{language || "Code"}</span>
        <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">Tab = 4 spaces</span>
      </div>
      <div className="relative grid min-h-[260px] grid-cols-[48px_minmax(0,1fr)] font-mono text-sm leading-6">
        <div ref={gutterRef} className="pointer-events-none max-h-[520px] overflow-hidden border-r border-slate-800 bg-slate-900/80 px-2 py-3 text-right text-slate-600">
          {lines.map((_, index) => (
            <div key={index} className="h-6 select-none">{index + 1}</div>
          ))}
        </div>
        <div className="relative max-h-[520px] min-h-[260px] overflow-hidden">
          <div
            ref={highlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-4 py-3 text-sm leading-6"
          >
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} className="min-h-6">
                {line.length === 0 ? "\u00a0" : tokenizeCodeLine(line, normalizedLanguage).map((token, tokenIndex) => (
                  <span key={`${lineIndex}-${tokenIndex}`} className={colorForToken(token.type)}>
                    {token.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="relative z-10 h-[520px] min-h-[260px] w-full resize-y overflow-auto whitespace-pre rounded-none border-0 bg-transparent px-4 py-3 font-mono text-sm leading-6 text-transparent caret-white outline-none selection:bg-fuchsia-400/30"
          />
        </div>
      </div>
    </div>
  )
}

function WorkspaceShell({ icon: Icon, title, description, aiUsed, actionLabel, loading, onAction, children }: {
  icon: ElementType
  title: string
  description: string
  aiUsed: string
  actionLabel: string
  loading: boolean
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
            {aiUsed ? <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700"><Sparkles size={12} /> IA utilisee: {aiUsed}</p> : null}
          </div>
        </div>
        {actionLabel && onAction ? (
          <Button type="button" variant="outline" onClick={onAction} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
            {actionLabel}
          </Button>
        ) : null}
      </div>
      <div className="bg-slate-50/60 p-4 md:p-5">{children}</div>
    </div>
  )
}

function DocumentContext({ notions, suggestions, onAsk }: { notions: NotionCard[]; suggestions: string[]; onAsk: (value: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><FileText size={15} /></span>
        <h2 className="text-sm font-bold text-slate-950">Contexte du PDF</h2>
      </div>
      <div className="space-y-3">
        {notions.slice(0, 5).map((notion) => (
          <button key={notion.title} type="button" onClick={() => onAsk(`Explique la notion: ${notion.title}`)} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-fuchsia-200 hover:bg-white">
            <p className="text-sm font-bold text-slate-900">{notion.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notion.description}</p>
          </button>
        ))}
      </div>
      {suggestions.length ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Questions rapides</p>
          <div className="flex flex-col gap-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => onAsk(suggestion)} className="rounded-lg bg-fuchsia-50 px-3 py-2 text-left text-xs font-bold leading-5 text-[var(--accent)] transition hover:bg-fuchsia-100">
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FeedbackSummary({ report }: { report: FeedbackReport | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={15} /></span>
        <h2 className="text-sm font-bold text-slate-950">Feedback</h2>
      </div>
      {!report ? (
        <p className="text-sm leading-6 text-slate-500">Soumets ton code ou ton quiz pour obtenir un diagnostic et un plan de revision.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-bold leading-6 text-slate-900">{textFromAiValue(report.scoreSummary) || "Feedback genere."}</p>
          {typeof report.totalScore === "number" && typeof report.maxScore === "number" ? (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{report.totalScore} / {report.maxScore}</div>
          ) : null}
          {(report.practicePlan ?? []).slice(0, 4).map((item, i) => {
            const rendered = textFromAiValue(item)
            if (!rendered) return null
            return (
              <p key={`practice-plan-${i}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
                {rendered}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FeedbackDetails({ report }: { report: FeedbackReport | null }) {
  if (!report) return null
  const exerciseFeedback = report.perExercise ?? []
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="text-base font-bold text-emerald-900">{textFromAiValue(report.scoreSummary) || "Feedback genere."}</h3>
      {exerciseFeedback.length ? (
        <div className="mt-3 space-y-3">
          {exerciseFeedback.map((item, index) => (
            <div key={item.id || `exercise-feedback-${index}`} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {item.isCorrect ? "Correct" : "A corriger"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                  {item.score} / {item.maxScore}
                </span>
                {textFromAiValue(item.concept) ? <span className="text-xs font-bold text-slate-500">{textFromAiValue(item.concept)}</span> : null}
              </div>
              <p className="font-semibold leading-6 text-slate-800">{textFromAiValue(item.feedback)}</p>
              {textFromAiValue(item.whatStudentCodeDoes) ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Ce que ton code fait</p>
                  <p className="mt-1 leading-6 text-slate-700">{textFromAiValue(item.whatStudentCodeDoes)}</p>
                </div>
              ) : null}
              {textFromAiValue(item.whyWrong) ? (
                <div className="mt-3 rounded-lg bg-rose-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-rose-500">Pourquoi c'est faux</p>
                  <p className="mt-1 leading-6 text-rose-800">{textFromAiValue(item.whyWrong)}</p>
                </div>
              ) : null}
              {textFromAiValue(item.improvedSolution) ? (
                <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                  <code>{textFromAiValue(item.improvedSolution)}</code>
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {(report.weakAreas ?? []).map((area, index) => {
          const areaRecord = typeof area === "object" && area !== null ? area as { concept?: unknown; issue?: unknown; recommendation?: unknown } : null
          const concept = textFromAiValue(areaRecord?.concept) || `Point ${index + 1}`
          const issue = textFromAiValue(areaRecord?.issue ?? area)
          const recommendation = textFromAiValue(areaRecord?.recommendation)
          return (
          <div key={`weak-area-${index}-${concept}`} className="rounded-xl bg-white p-3 text-sm">
            <p className="font-bold text-slate-950">{concept}</p>
            {issue ? <p className="mt-1 leading-5 text-slate-600">{issue}</p> : null}
            {recommendation ? <p className="mt-2 text-xs font-bold text-emerald-700">{recommendation}</p> : null}
          </div>
          )
        })}
      </div>
    </div>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
        <Loader2 className="animate-spin" size={16} /> {label}
      </div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <Sparkles className="mx-auto mb-3 text-[var(--accent)]" size={28} />
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
