"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon,
  Maximize2, Minimize2, Download, ZoomIn, ZoomOut, FileText, X, ArrowLeft,
  Sparkles, Send, Loader2, MessageSquare, ChevronDown, Code2, Copy,
  Brain, CheckCircle2, ListChecks, Target, RefreshCw, GraduationCap,
} from "lucide-react"

export type BreadcrumbItem = { label: string; href?: string }

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  aiUsed?: string
  uncertaintyNote?: string | null
  presentation?: TutorPresentation | null
  suggestions?: string[]
}

type TutorPresentation = {
  title?: string
  shortAnswer?: string
  badges?: string[]
  visualItems?: Array<{ label?: string; value?: string; hint?: string }>
  diagramSteps?: Array<{ label?: string; detail?: string }>
  codeExample?: { language?: string; title?: string; code?: string } | null
  takeaways?: string[]
}

type AiMode = "chat" | "quiz" | "code"
type QuizQuestion = {
  id: string
  concept: string
  difficulty: "easy" | "medium" | "hard"
  question: string
  options: string[]
  correctOptionIndexes: number[]
  explanation: string
}
type QuizData = { title: string; instructions: string; questions: QuizQuestion[] }
type FeedbackReport = {
  scoreSummary: string
  totalScore?: number
  maxScore?: number
  perQuestion?: Array<{ id: string; isCorrect: boolean; feedback: string; concept?: string; explanation?: string }>
  perExercise?: Array<{ id: string; score: number; maxScore: number; concept?: string; feedback: string; missingConcepts?: string[]; improvedSolution?: string }>
  weakAreas: Array<{ concept: string; issue: string; recommendation: string }>
  recommendations: string[]
  practicePlan: string[]
}
type CodeExercise = {
  id: string
  title: string
  difficulty: "easy" | "medium" | "hard"
  concept: string
  language: string
  instructions: string
  starterCode: string
  expectedFocus: string
  hints: string[]
}
type CodePractice = { title: string; instructions: string; exercises: CodeExercise[] }
type TutorNotion = { title: string; description: string }

function shortenTutorNotionDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return "Introduction courte de la notion."

  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0]?.trim() || normalized
  return firstSentence.length > 92 ? `${firstSentence.slice(0, 89).trim()}...` : firstSentence
}

type Props = {
  url: string
  name: string
  breadcrumbs: BreadcrumbItem[]
  attachmentId?: string
}

export default function PDFViewerCanvas({ url, name, breadcrumbs, attachmentId }: Props) {
  const router          = useRouter()
  const containerRef    = useRef<HTMLDivElement>(null)
  const scrollRef       = useRef<HTMLDivElement>(null)
  const pageRefs        = useRef<(HTMLDivElement | null)[]>([])
  const canvasRefs      = useRef<(HTMLCanvasElement | null)[]>([])
  const textLayerRefs   = useRef<(HTMLDivElement | null)[]>([])
  const pdfRef          = useRef<any>(null)
  const pdfjsLibRef     = useRef<any>(null)
  const renderVersionRef = useRef(0)
  const renderTasksRef = useRef<any[]>([])
  const intersectionMap = useRef<Map<Element, number>>(new Map())
  const chatEndRef      = useRef<HTMLDivElement>(null)
  const chatInputRef    = useRef<HTMLTextAreaElement>(null)
  const scaleRef        = useRef(1.2)
  const userZoomedRef   = useRef(false)
  const initialFitDoneRef = useRef(false)
  const scaleBeforeTutorRef = useRef<number | null>(null)

  const [numPages,     setNumPages]     = useState(0)
  const [pageNum,      setPageNum]      = useState(1)
  const [pageInput,    setPageInput]    = useState("1")
  const [scale,        setScale]        = useState(1.2)
  const [pdfFitsWidth, setPdfFitsWidth] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // AI state
  const [aiEnabled,     setAiEnabled]     = useState(false)
  const [aiReady,       setAiReady]       = useState(false)
  const [suggestions,   setSuggestions]   = useState<string[]>([])
  const [tutorNotions,  setTutorNotions]  = useState<TutorNotion[]>([])
  const [chatOpen,      setChatOpen]      = useState(false)
  const [messages,      setMessages]      = useState<ChatMessage[]>([])
  const [chatInput,     setChatInput]     = useState("")
  const [chatLoading,   setChatLoading]   = useState(false)
  const [tutorHomeExiting, setTutorHomeExiting] = useState(false)
  const [tutorSuggestionMode, setTutorSuggestionMode] = useState<"notion" | null>(null)
  const tutorTransitionTimerRef = useRef<number | null>(null)
  const [suggestionsVisible, setSuggestionsVisible] = useState(true)
  const [aiMode,        setAiMode]        = useState<AiMode>("chat")
  const [practiceChooserOpen, setPracticeChooserOpen] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [practiceError, setPracticeError] = useState<string | null>(null)
  const [quiz,          setQuiz]          = useState<QuizData | null>(null)
  const [quizAnswers,   setQuizAnswers]   = useState<Record<string, number[]>>({})
  const [quizFeedback,  setQuizFeedback]  = useState<FeedbackReport | null>(null)
  const [quizAiUsed,    setQuizAiUsed]    = useState<string>("")
  const [codePractice,  setCodePractice]  = useState<CodePractice | null>(null)
  const [codeSubmissions, setCodeSubmissions] = useState<Record<string, string>>({})
  const [codeFeedback,  setCodeFeedback]  = useState<FeedbackReport | null>(null)
  const [codeAiUsed,    setCodeAiUsed]    = useState<string>("")
  const [selectedPdfText, setSelectedPdfText] = useState<{ text: string; x: number; y: number } | null>(null)

  const MIN_SCALE = 0.5
  const MAX_SCALE = 3.0

  function clampScale(value: number) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value))
  }

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  // ── Load PDF ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLibRef.current = pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
        const doc = await pdfjsLib.getDocument({ url, withCredentials: false }).promise
        if (cancelled) return
        pdfRef.current = doc
        setNumPages(doc.numPages)
        setLoading(false)
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || "Impossible de charger le PDF"); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [url])

  // ── Render pages ──────────────────────────────────────────────────────────────
  const renderAllPages = useCallback(async (sc: number) => {
    const doc = pdfRef.current
    const pdfjsLib = pdfjsLibRef.current
    if (!doc || !pdfjsLib) return
    const version = ++renderVersionRef.current
    const total   = doc.numPages
    renderTasksRef.current.forEach(task => {
      try { task?.cancel?.() } catch {}
    })
    renderTasksRef.current = []

    for (let i = 1; i <= total; i++) {
      if (renderVersionRef.current !== version) break
      const canvas = canvasRefs.current[i - 1]
      const textLayerDiv = textLayerRefs.current[i - 1]
      if (!canvas) continue
      try {
        const page     = await doc.getPage(i)
        if (renderVersionRef.current !== version) break
        const viewport = page.getViewport({ scale: sc })
        const ctx      = canvas.getContext("2d")
        if (!ctx) continue
        const outputScale = Math.min(window.devicePixelRatio || 1, 2.25)
        canvas.width  = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        canvas.style.transform = "none"
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const transform = outputScale !== 1
          ? [outputScale, 0, 0, outputScale, 0, 0]
          : undefined
        const task = page.render({ canvasContext: ctx, viewport, transform })
        renderTasksRef.current[i - 1] = task
        await task.promise
        if (renderTasksRef.current[i - 1] === task) renderTasksRef.current[i - 1] = null

        if (textLayerDiv && renderVersionRef.current === version) {
          textLayerDiv.replaceChildren()
          textLayerDiv.style.setProperty("--total-scale-factor", String(sc))
          textLayerDiv.style.setProperty("--scale-round-x", "1px")
          textLayerDiv.style.setProperty("--scale-round-y", "1px")
          const textContent = await page.getTextContent()
          const textLayer = new (pdfjsLib as any).TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          })
          await textLayer.render()
        }
      } catch (e: any) {
        if (e?.name === "RenderingCancelledException") break
      }
    }

  }, [])

  useEffect(() => {
    if (!loading && !error && numPages > 0) renderAllPages(scale)
  }, [loading, error, numPages, scale, renderAllPages])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || loading || error || numPages === 0) return

    function updateFit() {
      const currentScrollEl = scrollRef.current
      if (!currentScrollEl) return
      const firstCanvas = canvasRefs.current[0]
      const pageWidth = firstCanvas?.getBoundingClientRect().width ?? 0
      const availableWidth = currentScrollEl.clientWidth - 48
      setPdfFitsWidth(pageWidth > 0 && pageWidth <= availableWidth + 1)
    }

    updateFit()
    const observer = new ResizeObserver(updateFit)
    observer.observe(scrollEl)
    const firstCanvas = canvasRefs.current[0]
    if (firstCanvas) observer.observe(firstCanvas)
    return () => observer.disconnect()
  }, [loading, error, numPages, scale, chatOpen])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("pdf-ai-tutor-toggle", {
      detail: { open: chatOpen },
    }))

    return () => {
      window.dispatchEvent(new CustomEvent("pdf-ai-tutor-toggle", {
        detail: { open: false },
      }))
    }
  }, [chatOpen])

  useEffect(() => {
    const doc = pdfRef.current
    const scrollEl = scrollRef.current
    if (!doc || !scrollEl || loading || error || numPages === 0) return

    let cancelled = false
    async function fitFirstPage() {
      if (initialFitDoneRef.current) return
      try {
        const page = await doc.getPage(1)
        if (cancelled) return
        const currentScrollEl = scrollRef.current
        if (!currentScrollEl) return
        const baseViewport = page.getViewport({ scale: 1 })
        const availableWidth = currentScrollEl.clientWidth - 48
        const nextScale = Math.max(0.5, Math.min(1.45, Math.floor((availableWidth / baseViewport.width) * 100) / 100))
        if (userZoomedRef.current) return
        initialFitDoneRef.current = true
        setScale(current => Math.abs(current - nextScale) > 0.03 ? nextScale : current)
      } catch {}
    }

    fitFirstPage()
    return () => {
      cancelled = true
    }
  }, [loading, error, numPages])

  // ── Intersection observer (page tracking) ─────────────────────────────────────
  useEffect(() => {
    const doc = pdfRef.current
    const scrollEl = scrollRef.current
    if (!doc || !scrollEl || loading || error || numPages === 0) return

    let cancelled = false
    let fitTimer: number | null = null

    async function fitToTutorPane() {
      try {
        const page = await doc.getPage(1)
        if (cancelled || !scrollRef.current) return
        const baseViewport = page.getViewport({ scale: 1 })
        const availableWidth = scrollRef.current.clientWidth - 48
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.floor((availableWidth / baseViewport.width) * 100) / 100))
        setScale(current => Math.abs(current - nextScale) > 0.01 ? nextScale : current)
      } catch {}
    }

    if (chatOpen) {
      if (scaleBeforeTutorRef.current === null) {
        scaleBeforeTutorRef.current = scaleRef.current
      }
      fitTimer = window.setTimeout(() => {
        void fitToTutorPane()
      }, 380)
    } else if (scaleBeforeTutorRef.current !== null) {
      const previousScale = scaleBeforeTutorRef.current
      scaleBeforeTutorRef.current = null
      setScale(current => Math.abs(current - previousScale) > 0.01 ? previousScale : current)
    }

    return () => {
      cancelled = true
      if (fitTimer) window.clearTimeout(fitTimer)
    }
  }, [chatOpen, loading, error, numPages])

  useEffect(() => {
    if (numPages === 0 || !scrollRef.current) return
    const thresholds = Array.from({ length: 21 }, (_, i) => i * 0.05)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersectionMap.current.set(entry.target, entry.intersectionRatio)
        }
        let maxRatio = -1; let bestIdx = 0
        pageRefs.current.forEach((ref, idx) => {
          const ratio = ref ? (intersectionMap.current.get(ref) ?? 0) : 0
          if (ratio > maxRatio) { maxRatio = ratio; bestIdx = idx }
        })
        setPageNum(bestIdx + 1)
        setPageInput(String(bestIdx + 1))
      },
      { root: scrollRef.current, threshold: thresholds },
    )
    for (const ref of pageRefs.current) { if (ref) observer.observe(ref) }
    return () => observer.disconnect()
  }, [numPages])

  // ── Fullscreen ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // ── AI: check availability + load suggestions ─────────────────────────────────
  useEffect(() => {
    if (!attachmentId) return
    let cancelled = false
    let pollTimer: number | null = null

    function scheduleContextPoll() {
      pollTimer = window.setTimeout(loadContext, 2500)
    }

    function loadContext() {
      fetch(`/api/ai/context?attachmentId=${attachmentId}`)
        .then(r => r.json())
        .then(ctx => {
          if (cancelled) return
          if (ctx.status === "ready") {
            if (Array.isArray(ctx.suggestions)) {
              setSuggestions(ctx.suggestions)
            }
            if (Array.isArray(ctx.notions)) {
              setTutorNotions(
                ctx.notions
                  .map((notion: any) => ({
                    title: String(notion?.title ?? "").trim(),
                    description: shortenTutorNotionDescription(String(notion?.description ?? "")),
                  }))
                  .filter((notion: TutorNotion) => notion.title)
                  .slice(0, 8),
              )
            }
            setAiReady(true)
          } else if (ctx.status === "pending") {
            scheduleContextPoll()
          }
        })
        .catch(() => {})
    }

    fetch("/api/ai/status")
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (!d.enabled) return
        setAiEnabled(true)
        loadContext()
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (pollTimer) window.clearTimeout(pollTimer)
    }
  }, [attachmentId])

  // ── Scroll chat to bottom ─────────────────────────────────────────────────────
  // ── PDF controls ──────────────────────────────────────────────────────────────
  function goTo(n: number) {
    const p = Math.max(1, Math.min(n, numPages))
    pageRefs.current[p - 1]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function commitPageInput() {
    const n = parseInt(pageInput, 10)
    if (!isNaN(n)) goTo(n)
    else setPageInput(String(pageNum))
  }

  function zoom(delta: number) {
    if (chatOpen) return
    userZoomedRef.current = true
    setScale(s => {
      const next = Math.round((s + delta) * 10) / 10
      return clampScale(next)
    })
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  async function handleDownload() {
    try {
      const res  = await fetch(url)
      const blob = await res.blob()
      const a    = document.createElement("a")
      a.href     = URL.createObjectURL(blob)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch {}
  }

  // ── AI: send a chat message ───────────────────────────────────────────────────
  async function sendMessage(questionOverride?: string, skipIntro = false) {
    const question = (questionOverride ?? chatInput).trim()
    if (!question || !attachmentId || chatLoading || (tutorHomeExiting && !skipIntro)) return

    if (showEmptyTutor && !skipIntro) {
      const exitDelay = tutorSuggestionMode === "notion" ? 760 : 520
      setTutorHomeExiting(true)
      window.setTimeout(() => {
        void sendMessage(question, true)
      }, exitDelay)
      return
    }

    setChatInput("")
    setChatOpen(true)
    setTutorHomeExiting(false)
    setTutorSuggestionMode(null)
    setMessages(prev => [...prev, { role: "user", content: question }])
    setChatLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId, question, studentLevel: "intermediate" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur")
      const r = data.response
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: r.answer,
          aiUsed: data.aiUsed ?? "IA",
          uncertaintyNote: r.uncertaintyNote ?? null,
          presentation: r.presentation ?? null,
          suggestions: Array.isArray(r.suggestions) ? r.suggestions.slice(0, 3) : [],
        },
      ])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Désolé, une erreur s'est produite : ${err.message}` },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  function handleSuggestionClick(s: string) {
    setSuggestionsVisible(false)
    sendMessage(s)
  }

  function choosePracticeMode(mode: Exclude<AiMode, "chat">) {
    setPracticeChooserOpen(false)
    setAiMode(mode)
  }

  function startPracticeFromChat() {
    openGeekyWorkspace("practice")
  }

  function startQuizFromChat() {
    openGeekyWorkspace("quiz")
  }

  function openGeekyWorkspace(mode: "practice" | "quiz") {
    if (!attachmentId) return
    const params = new URLSearchParams({ mode, attachmentId })
    if (name) params.set("name", name)
    router.push(`/student-dashboard/geeky?${params.toString()}`)
  }

  function startNewChat() {
    setAiMode("chat")
    setMessages([])
    setChatInput("")
    setTutorHomeExiting(false)
    setTutorSuggestionMode(null)
    setPracticeChooserOpen(false)
    window.requestAnimationFrame(() => chatInputRef.current?.focus())
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function capturePdfSelection() {
    const selection = window.getSelection()
    const text = selection?.toString().trim() ?? ""
    if (!selection || !text || !scrollRef.current || selection.rangeCount === 0) {
      setSelectedPdfText(null)
      return
    }

    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    const element = container.nodeType === Node.ELEMENT_NODE
      ? container as Element
      : container.parentElement

    if (!element || !scrollRef.current.contains(element)) {
      setSelectedPdfText(null)
      return
    }

    const rect = range.getBoundingClientRect()
    setSelectedPdfText({
      text: text.slice(0, 2500),
      x: Math.min(window.innerWidth - 260, Math.max(16, rect.left + rect.width / 2 - 130)),
      y: Math.max(16, rect.top - 54),
    })
  }

  function askAboutSelection() {
    if (!selectedPdfText?.text) return
    setAiMode("chat")
    setChatOpen(true)
    sendMessage([
      "Explique ce passage sélectionné du PDF.",
      "Donne une réponse claire, puis indique les notions à retenir.",
      "",
      `Passage sélectionné:\n\"\"\"\n${selectedPdfText.text}\n\"\"\"`,
    ].join("\n"))
    setSelectedPdfText(null)
    window.getSelection()?.removeAllRanges()
  }

  async function callPractice(action: string, payload: Record<string, unknown> = {}) {
    if (!attachmentId) return null
    setPracticeLoading(true)
    setPracticeError(null)
    try {
      const res = await fetch("/api/ai/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, attachmentId, studentLevel: "intermediate", ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur")
      return data as { aiUsed: string; data: any }
    } catch (err: any) {
      setPracticeError(err.message ?? "Erreur IA")
      return null
    } finally {
      setPracticeLoading(false)
    }
  }

  async function generateQuiz() {
    const result = await callPractice("generate_quiz", { questionCount: 9 })
    if (!result) return
    setQuiz(result.data)
    setQuizAiUsed(result.aiUsed)
    setQuizAnswers({})
    setQuizFeedback(null)
  }

  async function submitQuiz() {
    if (!quiz) return
    const answers = quiz.questions.map(q => ({
      questionId: q.id,
      selectedOptionIndexes: quizAnswers[q.id] ?? [],
    }))
    const result = await callPractice("grade_quiz", { quiz, answers })
    if (!result) return
    setQuizFeedback(result.data)
    setQuizAiUsed(result.aiUsed)
  }

  function toggleQuizAnswer(questionId: string, optionIndex: number) {
    setQuizAnswers(prev => {
      const current = prev[questionId] ?? []
      const next = current.includes(optionIndex)
        ? current.filter(i => i !== optionIndex)
        : [...current, optionIndex]
      return { ...prev, [questionId]: next.sort((a, b) => a - b) }
    })
  }

  async function generateCodeExercises() {
    const result = await callPractice("generate_code_exercises")
    if (!result) return
    setCodePractice(result.data)
    setCodeAiUsed(result.aiUsed)
    setCodeSubmissions(
      Object.fromEntries((result.data.exercises ?? []).map((ex: CodeExercise) => [ex.id, ex.starterCode])),
    )
    setCodeFeedback(null)
  }

  async function submitCodeExercises() {
    if (!codePractice) return
    const submissions = codePractice.exercises.map(ex => ({
      exerciseId: ex.id,
      answer: codeSubmissions[ex.id] ?? "",
    }))
    const result = await callPractice("grade_code_exercises", {
      exercises: codePractice.exercises,
      submissions,
    })
    if (!result) return
    setCodeFeedback(result.data)
    setCodeAiUsed(result.aiUsed)
  }

  const scalePercent = Math.round(scale * 100)
  const showEmptyTutor = aiMode === "chat" && messages.length === 0
  const assistantSectionTitleRegex = /^(Réponse simple|Explication|Exemple concret|À retenir)\s*:?\s*$/i
  const codeBlockRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g

  function parseAssistantContent(content: string): Array<
    | { type: "text"; text: string }
    | { type: "code"; lang: string; code: string }
  > {
    const blocks: Array<
      | { type: "text"; text: string }
      | { type: "code"; lang: string; code: string }
    > = []
    codeBlockRegex.lastIndex = 0
    let lastIndex = 0
    let match: RegExpExecArray | null = null

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const [fullMatch, rawLang, rawCode] = match
      const start = match.index

      if (start > lastIndex) {
        blocks.push({ type: "text", text: content.slice(lastIndex, start) })
      }

      blocks.push({
        type: "code",
        lang: (rawLang || "text").trim(),
        code: rawCode.replace(/\n$/, ""),
      })

      lastIndex = start + fullMatch.length
    }

    if (lastIndex < content.length) {
      blocks.push({ type: "text", text: content.slice(lastIndex) })
    }

    if (blocks.length === 0) {
      blocks.push({ type: "text", text: content })
    }

    return blocks
  }

  async function copyCodeBlock(code: string) {
    try { await navigator.clipboard.writeText(code) } catch {}
  }

  function renderInlineMarkdown(text: string, keyPrefix: string) {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(part => part.length > 0)
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${keyPrefix}-b-${i}`} style={{ fontWeight: 900, color: "#0f172a" }}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={`${keyPrefix}-c-${i}`}
            style={{
              padding: "2px 5px",
              borderRadius: 6,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#9f1239",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "0.92em",
              fontWeight: 750,
            }}
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      return <span key={`${keyPrefix}-t-${i}`}>{part}</span>
    })
  }

  function parseMarkdownTable(lines: string[], startIndex: number) {
    const separator = lines[startIndex + 1]?.trim() ?? ""
    if (!separator || !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator)) return null

    const rows: string[][] = []
    let index = startIndex
    while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
      if (index !== startIndex + 1) {
        const cells = lines[index]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map(cell => cell.trim())
        rows.push(cells)
      }
      index += 1
    }

    if (rows.length < 2) return null
    return { header: rows[0], body: rows.slice(1), nextIndex: index }
  }

  function renderAssistantTextBlock(textBlock: string, keyPrefix: string) {
    const lines = textBlock.split(/\r?\n/)
    const nodes = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]
      const text = line.trim()
      if (!text) {
        nodes.push(<div key={`${keyPrefix}-sp-${i}`} style={{ height: 7 }} />)
        i += 1
        continue
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) {
        nodes.push(
          <div
            key={`${keyPrefix}-hr-${i}`}
            style={{
              height: 1,
              background: "#0f172a",
              opacity: 0.08,
              margin: "10px 0",
            }}
          />,
        )
        i += 1
        continue
      }

      const table = parseMarkdownTable(lines, i)
      if (table) {
        nodes.push(
          <div key={`${keyPrefix}-table-${i}`} style={{ overflowX: "auto", margin: "10px 0" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", fontSize: 13 }}>
              <thead>
                <tr>
                  {table.header.map((cell, ci) => (
                    <th key={ci} style={{ padding: "10px 11px", background: "color-mix(in srgb, var(--accent) 8%, white)", color: "#0f172a", textAlign: "left", fontWeight: 900, borderBottom: "1px solid #e2e8f0" }}>
                      {renderInlineMarkdown(cell, `${keyPrefix}-th-${i}-${ci}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: "9px 11px", borderTop: ri === 0 ? "none" : "1px solid #eef2f7", color: "#334155", lineHeight: 1.45, verticalAlign: "top" }}>
                        {renderInlineMarkdown(cell, `${keyPrefix}-td-${i}-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
        i = table.nextIndex
        continue
      }

      const headingMatch = /^(#{1,6})\s+(.+)$/.exec(text)
      const headingLevel = headingMatch?.[1].length ?? 0
      const headingText = headingMatch?.[2]?.trim()
      const isTitle = !!headingMatch || assistantSectionTitleRegex.test(text) || /^\*\*[^*]+\*\*$/.test(text)
      const isBullet = /^[-•]\s+/.test(text)
      const cleanText = headingText ?? (isBullet ? text.replace(/^[-•]\s+/, "") : text)

      nodes.push(
        <p
          key={`${keyPrefix}-p-${i}`}
          style={{
            margin: 0,
            paddingLeft: isBullet ? 14 : 0,
            position: "relative",
            fontSize: headingLevel === 2 ? 18 : isTitle ? 16 : 14,
            fontWeight: isTitle ? 900 : 500,
            lineHeight: isTitle ? 1.35 : 1.72,
            color: isTitle ? "#0f172a" : "#334155",
          }}
        >
          {isBullet && <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>•</span>}
          {renderInlineMarkdown(cleanText, `${keyPrefix}-line-${i}`)}
        </p>,
      )
      i += 1
    }

    return nodes
  }

  function renderAssistantContentBlocks(content: string, keyPrefix: string) {
    return parseAssistantContent(content).map((block, bi) => (
      block.type === "text" ? (
        <div key={`${keyPrefix}-text-${bi}`} style={{ padding: "2px 2px", color: "#334155" }}>
          {renderAssistantTextBlock(block.text, `${keyPrefix}-line-${bi}`)}
        </div>
      ) : (
        <div
          key={`${keyPrefix}-code-${bi}`}
          style={{
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            overflow: "visible",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: "1px solid #e5e7eb",
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Code2 size={14} color="#334155" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {block.lang.charAt(0).toUpperCase() + block.lang.slice(1)}
              </span>
            </div>
            <button
              onClick={() => copyCodeBlock(block.code)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Copier le code"
            >
              <Copy size={14} />
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "12px 14px 14px",
              overflowX: "auto",
              fontSize: 14,
              lineHeight: 1.75,
              color: "#111827",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            }}
          >
            <code>{block.code}</code>
          </pre>
        </div>
      )
    ))
  }

  function renderTutorActionCard(
    title: string,
    subtitle: string,
    Icon: typeof FileText,
    onClick: () => void,
    tint: "pink" | "violet" = "pink",
    motionStyle?: React.CSSProperties,
  ) {
    const color = tint === "pink" ? "var(--accent)" : "#9333ea"
    const soft = tint === "pink"
      ? "color-mix(in srgb, var(--accent) 9%, white)"
      : "#f3e8ff"
    const border = tint === "pink"
      ? "color-mix(in srgb, var(--accent) 18%, white)"
      : "#ead6ff"

    return (
      <button
        className="bi-tutor-action-card"
        onClick={onClick}
        style={{
          minHeight: 88,
          display: "grid",
          gridTemplateColumns: "58px 1fr 20px",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px 14px 14px",
          borderRadius: 14,
          border: "1px solid #e7dcea",
          background: "rgba(255,255,255,0.86)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
          cursor: "pointer",
          textAlign: "left",
          color: "#0f172a",
          transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1), background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
          ...motionStyle,
        }}
        onMouseEnter={e => {
          if (tutorHomeExiting) return
          e.currentTarget.style.transform = "translate3d(0,-4px,0) scale(1.01)"
          e.currentTarget.style.background = "rgba(255,255,255,0.96)"
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 28%, white)"
          e.currentTarget.style.boxShadow = "0 20px 42px rgba(190,24,170,0.16)"
        }}
        onMouseLeave={e => {
          if (tutorHomeExiting) return
          e.currentTarget.style.transform = "translate3d(0,0,0) scale(1)"
          e.currentTarget.style.background = "rgba(255,255,255,0.86)"
          e.currentTarget.style.borderColor = "#e7dcea"
          e.currentTarget.style.boxShadow = "0 14px 30px rgba(15,23,42,0.08)"
        }}
      >
        <span className="bi-tutor-action-icon" style={{
          width: 50,
          height: 50,
          borderRadius: 999,
          background: soft,
          border: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1), background 0.18s ease",
        }}>
          <Icon size={24} strokeWidth={2.2} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 950, color: "#0f172a", lineHeight: 1.2 }}>
            {title}
          </span>
          <span style={{ display: "block", marginTop: 5, fontSize: 13, fontWeight: 650, color: "#526173", lineHeight: 1.35 }}>
            {subtitle}
          </span>
        </span>
        <ChevronRightIcon className="bi-tutor-action-arrow" size={19} color="var(--accent)" />
      </button>
    )
  }

  function renderEmptyTutorHome() {
    const askSummary = () => sendMessage("Fais un resume clair de ce PDF. Donne les idees essentielles et les points a retenir.")
    const showNotionSuggestions = () => {
      if (tutorHomeExiting) return
      if (tutorTransitionTimerRef.current !== null) {
        window.clearTimeout(tutorTransitionTimerRef.current)
      }
      setTutorHomeExiting(true)
      tutorTransitionTimerRef.current = window.setTimeout(() => {
        setTutorSuggestionMode("notion")
        window.requestAnimationFrame(() => {
          setTutorHomeExiting(false)
          tutorTransitionTimerRef.current = null
        })
      }, 980)
    }
    const showTutorHome = () => {
      if (tutorHomeExiting) return
      if (tutorTransitionTimerRef.current !== null) {
        window.clearTimeout(tutorTransitionTimerRef.current)
      }
      setTutorHomeExiting(true)
      tutorTransitionTimerRef.current = window.setTimeout(() => {
        setTutorSuggestionMode(null)
        window.requestAnimationFrame(() => {
          setTutorHomeExiting(false)
          tutorTransitionTimerRef.current = null
        })
      }, 980)
    }
    const askExamples = () => sendMessage("Donne des exemples Python simples et clairs lies a cette page du PDF.")
    const exitPiece = (x: number, y: number, delay: number, scale = 0.98): React.CSSProperties => ({
      opacity: tutorHomeExiting ? 0 : 1,
      transform: tutorHomeExiting
        ? `translate3d(${x}px, ${y}px, 0) scale(${scale})`
        : "translate3d(0, 0, 0) scale(1)",
      transition: `opacity 0.32s ease ${delay}ms, transform 0.56s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      willChange: "opacity, transform",
    })

    if (tutorSuggestionMode === "notion") {
      const notionCards = tutorNotions.length > 0
        ? tutorNotions.slice(0, 8)
        : [
          { title: "Variables", description: "Affectation, noms, valeurs" },
          { title: "Types", description: "str, int, float, bool" },
          { title: "Conditions", description: "if, elif, else" },
          { title: "Boucles", description: "for, while, repetition" },
          { title: "Fonctions", description: "Organiser et reutiliser du code" },
          { title: "Listes", description: "Stocker plusieurs valeurs" },
          { title: "Erreurs", description: "Comprendre et corriger un probleme" },
          { title: "Exemples", description: "Voir une application concrete" },
        ]
      const notionExitDirections = [
        [-82, -28],
        [82, -28],
        [-96, 0],
        [96, 0],
        [-82, 28],
        [82, 28],
        [-66, 54],
        [66, 54],
      ]
      const notionCardExit = (index: number): React.CSSProperties => {
        const [x, y] = notionExitDirections[index % notionExitDirections.length]
        return {
          ["--notion-enter-x" as any]: `${Math.round(x * -0.42)}px`,
          ["--notion-enter-y" as any]: `${Math.round(y * -0.42)}px`,
          opacity: tutorHomeExiting ? 0 : 1,
          transform: tutorHomeExiting
            ? `translate3d(${x}px, ${y}px, 0) scale(0.94)`
            : "translate3d(0, 0, 0) scale(1)",
          transition: tutorHomeExiting
            ? `opacity 0.26s ease ${index * 48}ms, transform 0.58s cubic-bezier(0.22,1,0.36,1) ${index * 48}ms`
            : "transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, opacity 0.18s ease",
          willChange: "opacity, transform",
        }
      }

      return (
        <div style={{
          minHeight: "100%",
          borderRadius: 0,
          background: "radial-gradient(circle at 50% 0%, rgba(202, 31, 184, 0.10), transparent 38%), linear-gradient(180deg, #fff8ff 0%, #fbf7ff 56%, #f4f0fb 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 16,
          padding: "44px 34px 112px",
          boxSizing: "border-box",
          pointerEvents: tutorHomeExiting ? "none" : "auto",
        }}>
          <div style={{
            ...exitPiece(0, -34, 0, 0.96),
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-start",
            gap: 18,
            animation: tutorHomeExiting ? "none" : "chatMessageIn 0.5s cubic-bezier(0.22,1,0.36,1) 40ms backwards",
          }}>
            <div>
              <button
                className="bi-tutor-back-button"
                type="button"
                onClick={showTutorHome}
                style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(190,24,170,0.12)",
                background: "rgba(190, 24, 170, 0.08)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1), background 0.18s ease, border-color 0.18s ease",
                animation: tutorHomeExiting ? "none" : "tutorBackIn 0.46s cubic-bezier(0.22,1,0.36,1) 30ms backwards",
                ...exitPiece(-22, -12, 0, 0.96),
              }}>
                <ChevronLeft className="bi-tutor-back-icon" size={14} />
                Retour
              </button>
              <h3 style={{
                margin: "12px 0 0",
                fontSize: 24,
                lineHeight: 1.08,
                color: "#0f172a",
                fontWeight: 950,
                letterSpacing: 0,
              }}>
                Que veux-tu éclaircir ?
              </h3>
            </div>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}>
            {notionCards.map((card, index) => (
              <button
                key={card.title}
                onClick={() => sendMessage(`Explique la notion "${card.title}" depuis ce PDF. Ajoute un exemple simple et les points a retenir.`)}
                style={{
                  minHeight: 72,
                  padding: "12px 13px",
                  borderRadius: 16,
                  border: "1px solid rgba(190,24,170,0.14)",
                  background: "rgba(255,255,255,0.70)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  animation: tutorHomeExiting ? "none" : `notionCardIn 0.52s cubic-bezier(0.22,1,0.36,1) ${90 + index * 62}ms backwards`,
                  ...notionCardExit(index),
                }}
                onMouseEnter={e => {
                  if (tutorHomeExiting) return
                  e.currentTarget.style.transform = "translateY(-2px)"
                  e.currentTarget.style.background = "rgba(255,255,255,0.92)"
                  e.currentTarget.style.borderColor = "rgba(190,24,170,0.28)"
                }}
                onMouseLeave={e => {
                  if (tutorHomeExiting) return
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.background = "rgba(255,255,255,0.70)"
                  e.currentTarget.style.borderColor = "rgba(190,24,170,0.14)"
                }}
              >
                <span style={{
                  width: 38,
                  height: 38,
                  borderRadius: 13,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(190,24,170,0.13), rgba(139,92,246,0.12))",
                  color: "var(--accent)",
                }}>
                  <Brain size={17} strokeWidth={2.4} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 950, color: "#0f172a", lineHeight: 1.16 }}>
                    {card.title}
                  </span>
                  <span style={{
                    display: "-webkit-box",
                    marginTop: 5,
                    fontSize: 12.5,
                    fontWeight: 650,
                    color: "#64748b",
                    lineHeight: 1.3,
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {card.description}
                  </span>
                </span>
                <ChevronRightIcon size={17} color="var(--accent)" style={{ flexShrink: 0, opacity: 0.75 }} />
              </button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div style={{
        minHeight: "100%",
        borderRadius: 0,
        background: "radial-gradient(circle at 50% 0%, rgba(202, 31, 184, 0.11), transparent 36%), linear-gradient(180deg, #fff8ff 0%, #fbf7ff 56%, #f4f0fb 100%)",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "28px 28px 26px",
        boxSizing: "border-box",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
        pointerEvents: tutorHomeExiting ? "none" : "auto",
      }}>
        <div style={{
          position: "relative",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginBottom: -8,
          ...exitPiece(0, -74, 0, 0.92),
        }}>
          <div style={{
            position: "absolute",
            top: 68,
            left: "7%",
            width: "86%",
            height: 64,
            opacity: 0.36,
            background: "repeating-radial-gradient(ellipse at center, transparent 0 12px, rgba(190,24,173,0.16) 13px 14px)",
            transform: "scaleY(0.45)",
            pointerEvents: "none",
          }} />
          <img
            src="/ai-tutor-avatar.webp"
            alt=""
            style={{
              width: 108,
              height: 108,
              objectFit: "cover",
              objectPosition: "center top",
              flexShrink: 0,
              filter: "drop-shadow(0 14px 24px rgba(190,24,173,0.16))",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>

        <div style={{
          textAlign: "center",
          maxWidth: 430,
          ...exitPiece(0, -34, 70, 0.96),
        }}>
          <h2 style={{ margin: 0, fontSize: 25, fontWeight: 950, color: "#111827", letterSpacing: 0, lineHeight: 1.18 }}>
            <span style={{ color: "var(--accent)" }}>Geeky</span>, ton assistant Python
          </h2>
          <div style={{ width: 42, height: 3, borderRadius: 999, background: "var(--accent)", margin: "14px auto 15px" }} />
          <p style={{ margin: "0 0 26px", fontSize: 15, color: "#526173", lineHeight: 1.45, fontWeight: 650 }}>
            Pose une question, revise une notion<br />ou lance un exercice depuis ce PDF.
          </p>
        </div>

        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {renderTutorActionCard("R\u00e9sum\u00e9 du cours", "Comprendre l'essentiel rapidement", FileText, askSummary, "pink", {
            ...exitPiece(-96, 28, 130),
          })}
          {renderTutorActionCard("Expliquer une notion", "Variables, types, conditions...", Brain, showNotionSuggestions, "pink", {
            ...exitPiece(96, 28, 185),
          })}
          {renderTutorActionCard("Exemples Python", "Voir du code simple et clair", Code2, askExamples, "violet", {
            ...exitPiece(-86, 68, 240),
          })}
          {renderTutorActionCard("Quiz rapide", "Tester ta compr\u00e9hension", GraduationCap, () => setAiMode("quiz"), "violet", {
            ...exitPiece(86, 68, 295),
          })}
        </div>

      </div>
    )
  }

  function renderTutorPresentation(presentation?: TutorPresentation | null, detailContent?: string) {
    if (!presentation) return null
    const detail = detailContent?.trim()

    return (
      <div style={{
        width: "100%",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {detail && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              {renderAssistantContentBlocks(detail, "presentation-detail")}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderPostAnswerSuggestions(suggestions?: string[]) {
    const cards = (suggestions ?? []).slice(0, 3)
    const actions = [
      { label: "Practice", icon: Code2, onClick: startPracticeFromChat },
      { label: "Quizz", icon: GraduationCap, onClick: startQuizFromChat },
      { label: "Nouvelle chat", icon: MessageSquare, onClick: startNewChat },
    ]

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        marginTop: 14,
        width: "100%",
      }}>
        {cards.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cards.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                type="button"
                onClick={() => sendMessage(suggestion)}
                style={{
                  width: "100%",
                  minHeight: 46,
                  borderRadius: 8,
                  border: "1px solid rgba(190,24,170,0.12)",
                  background: "rgba(255,248,255,0.70)",
                  cursor: "pointer",
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "32px 1fr",
                  alignItems: "center",
                  gap: 10,
                  color: "#0f172a",
                  textAlign: "left",
                  fontFamily: "inherit",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
                  transition: "transform 0.16s ease, background 0.16s ease, border-color 0.16s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateX(2px)"
                  e.currentTarget.style.background = "rgba(255,255,255,0.86)"
                  e.currentTarget.style.borderColor = "rgba(190,24,170,0.24)"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateX(0)"
                  e.currentTarget.style.background = "rgba(255,248,255,0.70)"
                  e.currentTarget.style.borderColor = "rgba(190,24,170,0.12)"
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  background: "var(--accent)",
                  flexShrink: 0,
                  fontWeight: 950,
                  boxShadow: "0 8px 16px color-mix(in srgb, var(--accent) 24%, transparent)",
                }}>
                  <span style={{ fontSize: 16, fontWeight: 950, lineHeight: 1 }}>i</span>
                </span>
                <span style={{
                  display: "-webkit-box",
                  fontSize: 12.5,
                  fontWeight: 800,
                  lineHeight: 1.32,
                  color: "#000000",
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {suggestion}
                </span>
              </button>
            ))}
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 6,
          marginTop: cards.length > 0 ? 16 : 0,
          marginBottom: -6,
        }}>
          {actions.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              style={{
                minWidth: 0,
                minHeight: 42,
                borderRadius: 8,
                border: "1px solid rgba(190,24,170,0.14)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,248,255,0.78))",
                cursor: "pointer",
                padding: "8px 7px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "var(--accent)",
                fontSize: 12.5,
                fontWeight: 1000,
                lineHeight: 1.1,
                textAlign: "center",
                fontFamily: "inherit",
                overflowWrap: "anywhere",
                textShadow: "0 1px 0 rgba(255,255,255,0.85)",
                boxShadow: "0 10px 18px rgba(190,24,170,0.13), 0 3px 0 rgba(190,24,170,0.12), inset 0 1px 0 rgba(255,255,255,0.95)",
                transition: "transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.background = "linear-gradient(180deg, #ffffff, rgba(255,248,255,0.92))"
                e.currentTarget.style.borderColor = "rgba(190,24,170,0.26)"
                e.currentTarget.style.boxShadow = "0 14px 24px rgba(190,24,170,0.18), 0 4px 0 rgba(190,24,170,0.14), inset 0 1px 0 rgba(255,255,255,1)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.background = "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,248,255,0.78))"
                e.currentTarget.style.borderColor = "rgba(190,24,170,0.14)"
                e.currentTarget.style.boxShadow = "0 10px 18px rgba(190,24,170,0.13), 0 3px 0 rgba(190,24,170,0.12), inset 0 1px 0 rgba(255,255,255,0.95)"
              }}
            >
              <Icon size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const btnStyle = (disabled?: boolean): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 7,
    border: "1px solid #e2e8f0",
    background: disabled ? "#f9fafb" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: disabled ? "#d1d5db" : "#374151",
    transition: "all 0.12s",
    outline: "none",
    flexShrink: 0,
  })

  const chatPanelWidth = "min(760px, 56vw)"
  const pdfAreaWidth = chatOpen ? `calc(100% - ${chatPanelWidth})` : "100%"
  const difficultyLabel: Record<string, string> = { easy: "Facile", medium: "Moyen", hard: "Difficile" }
  const difficultyColor: Record<string, string> = {
    easy: "#059669",
    medium: "#b45309",
    hard: "#dc2626",
  }

  function renderAiBadge(label: string) {
    if (!label) return null
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 9px", borderRadius: 999,
        background: "#eef2ff", border: "1px solid #c7d2fe",
        color: "#4f46e5", fontSize: 11, fontWeight: 800,
      }}>
        <Sparkles size={11} /> IA utilisée: {label}
      </div>
    )
  }

  function renderFeedback(report: FeedbackReport | null) {
    if (!report) return null
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
        <div style={{ padding: 14, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#166534" }}>
            {report.scoreSummary}
            {typeof report.totalScore === "number" && typeof report.maxScore === "number"
              ? ` (${report.totalScore}/${report.maxScore})`
              : ""}
          </p>
        </div>

        <div style={{ padding: 14, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 900, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Points faibles
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {report.weakAreas?.map((w, i) => (
              <div key={i}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#111827" }}>{w.concept}</p>
                <p style={{ margin: "2px 0", fontSize: 12, lineHeight: 1.55, color: "#7c2d12" }}>{w.issue}</p>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "#9a3412" }}>{w.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 900, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Plan d'étude
          </p>
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
            {report.practicePlan?.map((item, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.55, color: "#334155" }}>{item}</li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  function renderQuizMode() {
    return (
      <div style={{ flex: 1, padding: 16, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#0f172a" }}>Quiz adaptatif</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Questions depuis ce document, puis diagnostic et plan.</p>
          </div>
          <button onClick={generateQuiz} disabled={practiceLoading} style={{ ...primarySmallButton, opacity: practiceLoading ? 0.65 : 1 }}>
            {practiceLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {quiz ? "Regénérer" : "Générer"}
          </button>
        </div>

        {renderAiBadge(quizAiUsed)}
        {practiceError && <p style={errorPill}>{practiceError}</p>}

        {!quiz && !practiceLoading && (
          <div style={emptyPracticeBox}>
            <ListChecks size={30} color="#94a3b8" />
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", textAlign: "center" }}>Génère un quiz pour tester ta compréhension du PDF.</p>
          </div>
        )}

        {quiz && (
          <>
            <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#111827" }}>{quiz.title}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{quiz.instructions}</p>
            </div>

            {quiz.questions.map((q, qi) => (
              <div key={q.id} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>Q{qi + 1}</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: difficultyColor[q.difficulty], background: `${difficultyColor[q.difficulty]}14`, borderRadius: 999, padding: "2px 7px" }}>
                    {difficultyLabel[q.difficulty]}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{q.concept}</span>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 750, color: "#0f172a", lineHeight: 1.5 }}>{q.question}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {q.options.map((option, oi) => {
                    const selected = (quizAnswers[q.id] ?? []).includes(oi)
                    return (
                      <button key={oi} onClick={() => toggleQuizAnswer(q.id, oi)} style={{
                        display: "flex", alignItems: "center", gap: 9, textAlign: "left",
                        padding: "9px 10px", borderRadius: 9,
                        border: selected ? "1.5px solid #6366f1" : "1px solid #e2e8f0",
                        background: selected ? "#eef2ff" : "#fff",
                        color: "#334155", fontSize: 12, lineHeight: 1.45, cursor: "pointer",
                      }}>
                        <span style={{ width: 18, height: 18, borderRadius: 5, border: selected ? "none" : "1px solid #cbd5e1", background: selected ? "#6366f1" : "#fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {selected && <CheckCircle2 size={13} />}
                        </span>
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <button onClick={submitQuiz} disabled={practiceLoading || quiz.questions.some(q => !(quizAnswers[q.id]?.length))}
              style={{ ...primaryButton, opacity: practiceLoading || quiz.questions.some(q => !(quizAnswers[q.id]?.length)) ? 0.55 : 1 }}>
              {practiceLoading ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
              Corriger et créer mon plan
            </button>
            {renderFeedback(quizFeedback)}
          </>
        )}
      </div>
    )
  }

  function renderCodeMode() {
    return (
      <div style={{ flex: 1, padding: 16, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#0f172a" }}>Exercices code</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>3 faciles, 3 moyens, 3 difficiles. Complète les TODO.</p>
          </div>
          <button onClick={generateCodeExercises} disabled={practiceLoading} style={{ ...primarySmallButton, opacity: practiceLoading ? 0.65 : 1 }}>
            {practiceLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {codePractice ? "Regénérer" : "Générer"}
          </button>
        </div>

        {renderAiBadge(codeAiUsed)}
        {practiceError && <p style={errorPill}>{practiceError}</p>}

        {!codePractice && !practiceLoading && (
          <div style={emptyPracticeBox}>
            <Code2 size={30} color="#94a3b8" />
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", textAlign: "center" }}>Génère une série d'exercices de code liés au PDF.</p>
          </div>
        )}

        {codePractice && (
          <>
            <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#111827" }}>{codePractice.title}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{codePractice.instructions}</p>
            </div>

            {codePractice.exercises.map((ex, i) => (
              <div key={ex.id} style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>Ex {i + 1}</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: difficultyColor[ex.difficulty], background: `${difficultyColor[ex.difficulty]}14`, borderRadius: 999, padding: "2px 7px" }}>
                    {difficultyLabel[ex.difficulty]}
                  </span>
                  <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 800 }}>{ex.language}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 850, color: "#0f172a" }}>{ex.title}</p>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "#475569" }}>{ex.instructions}</p>
                <textarea
                  value={codeSubmissions[ex.id] ?? ""}
                  onChange={e => setCodeSubmissions(prev => ({ ...prev, [ex.id]: e.target.value }))}
                  spellCheck={false}
                  style={{
                    width: "100%", minHeight: 170, resize: "vertical",
                    border: "1px solid #d1d5db", borderRadius: 10,
                    padding: 12, fontSize: 12, lineHeight: 1.6, color: "#111827",
                    background: "#f9fafb",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    boxSizing: "border-box",
                  }}
                />
                {ex.hints?.length > 0 && (
                  <details style={{ fontSize: 12, color: "#64748b" }}>
                    <summary style={{ cursor: "pointer", fontWeight: 800 }}>Indices</summary>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {ex.hints.map((h, hi) => <li key={hi}>{h}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            ))}

            <button onClick={submitCodeExercises} disabled={practiceLoading}
              style={{ ...primaryButton, opacity: practiceLoading ? 0.55 : 1 }}>
              {practiceLoading ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
              Corriger mes exercices
            </button>
            {codeFeedback?.perExercise?.map(item => (
              <div key={item.id} style={{ padding: 12, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 900, color: "#111827" }}>{item.id}: {item.score}/{item.maxScore}</p>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "#475569" }}>{item.feedback}</p>
              </div>
            ))}
            {renderFeedback(codeFeedback)}
          </>
        )}
      </div>
    )
  }

  const primaryButton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "11px 16px", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", fontSize: 13, fontWeight: 850, cursor: "pointer",
  }
  const primarySmallButton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "8px 11px", borderRadius: 9, border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", fontSize: 12, fontWeight: 850, cursor: "pointer", flexShrink: 0,
  }
  const emptyPracticeBox: React.CSSProperties = {
    minHeight: 240, borderRadius: 14, border: "1.5px dashed #cbd5e1",
    background: "#f8fafc", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 12, padding: 24,
  }
  const errorPill: React.CSSProperties = {
    margin: 0, padding: "10px 12px", borderRadius: 10,
    background: "#fef2f2", border: "1px solid #fecaca",
    color: "#b91c1c", fontSize: 12, fontWeight: 700,
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh", height: "100%",
        background: "#fafafa",
        display: "flex", flexDirection: "column",
        fontFamily: "var(--ff-body,'DM Sans',sans-serif)",
      }}
    >
      <style>{`
        .bi-pdf-text-layer {
          --total-scale-factor: 1;
          --min-font-size: 1;
          --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
          --min-font-size-inv: calc(1 / var(--min-font-size));
          position: absolute;
          inset: 0;
          overflow: clip;
          opacity: 1;
          line-height: 1;
          text-align: initial;
          transform-origin: 0 0;
          -webkit-text-size-adjust: none;
          text-size-adjust: none;
          forced-color-adjust: none;
          caret-color: CanvasText;
          user-select: text;
          z-index: 0;
        }
        .bi-pdf-text-layer :is(span, br) {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .bi-pdf-text-layer > :not(.markedContent),
        .bi-pdf-text-layer .markedContent span:not(.markedContent) {
          z-index: 1;
          --font-height: 0;
          --scale-x: 1;
          --rotate: 0deg;
          font-size: calc(var(--text-scale-factor) * var(--font-height));
          transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
        }
        .bi-pdf-text-layer .markedContent {
          display: contents;
        }
        .bi-pdf-text-layer span[role="img"] {
          user-select: none;
        }
        .bi-pdf-text-layer .endOfContent {
          display: block;
          position: absolute;
          inset: 100% 0 0;
          z-index: 0;
          cursor: default;
          user-select: none;
        }
        .bi-pdf-text-layer.selecting .endOfContent {
          top: 0;
        }
        .bi-pdf-text-layer ::selection {
          background: color-mix(in srgb, #6366f1 35%, transparent);
        }
        @keyframes chatMessageIn {
          0% { opacity: 0; transform: translateY(14px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bi-tutor-action-card .bi-tutor-action-icon,
        .bi-tutor-action-card .bi-tutor-action-arrow {
          transition: transform 0.18s cubic-bezier(0.22,1,0.36,1), opacity 0.18s ease;
        }
        .bi-tutor-action-card:hover .bi-tutor-action-icon {
          transform: scale(1.08) rotate(-2deg);
        }
        .bi-tutor-action-card:hover .bi-tutor-action-arrow {
          transform: translateX(4px);
          opacity: 1;
        }
        .bi-tutor-back-button .bi-tutor-back-icon {
          transition: transform 0.18s cubic-bezier(0.22,1,0.36,1);
        }
        .bi-tutor-back-button:hover .bi-tutor-back-icon {
          transform: translateX(-3px);
        }
        @keyframes notionCardIn {
          from {
            opacity: 0;
            transform: translate3d(var(--notion-enter-x, 0), var(--notion-enter-y, 18px), 0) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes tutorBackIn {
          from {
            opacity: 0;
            transform: translate3d(-18px, -8px, 0) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes tutorChatIn {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* ── Breadcrumb ── */}
      {!isFullscreen && (
        <div style={{
          background: "#fff",
          borderBottom: chatOpen ? "0 solid transparent" : "1px solid #e8ecf3",
          padding: chatOpen ? "0 24px" : "10px 24px",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          maxHeight: chatOpen ? 0 : 58,
          opacity: chatOpen ? 0 : 1,
          overflow: "hidden",
          transform: chatOpen ? "translateY(-12px)" : "translateY(0)",
          transition: "max-height 0.28s cubic-bezier(0.22,1,0.36,1), padding 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease, transform 0.28s cubic-bezier(0.22,1,0.36,1)",
          pointerEvents: chatOpen ? "none" : "auto",
        }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6,
              border: "1px solid #e2e8f0", background: "#fff",
              cursor: "pointer", color: "#4b5563", transition: "all 0.12s",
            }}
            title="Retour"
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9" }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff" }}
          >
            <ArrowLeft size={14} />
          </button>
          <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
            {breadcrumbs.map((b, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <ChevronRight size={11} style={{ color: "#9ca3af", margin: "0 2px" }} />}
                {b.href ? (
                  <Link href={b.href} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>{b.label}</Link>
                ) : (
                  <span style={{
                    fontSize: 12,
                    fontWeight: i === breadcrumbs.length - 1 ? 700 : 400,
                    color: i === breadcrumbs.length - 1 ? "#111827" : "#4b5563",
                  }}>{b.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{
        background: "#fff",
        borderBottom: chatOpen ? "0 solid transparent" : "1px solid #e8ecf3",
        padding: chatOpen ? "0 20px" : "10px 20px",
        minHeight: chatOpen ? 0 : 72,
        maxHeight: chatOpen ? 0 : 120,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        opacity: chatOpen ? 0 : 1,
        overflow: "hidden",
        transform: chatOpen ? "translateY(-18px)" : "translateY(0)",
        transition: "max-height 0.34s cubic-bezier(0.22,1,0.36,1), min-height 0.34s cubic-bezier(0.22,1,0.36,1), padding 0.34s cubic-bezier(0.22,1,0.36,1), border 0.2s ease, opacity 0.22s ease, transform 0.34s cubic-bezier(0.22,1,0.36,1)",
        pointerEvents: chatOpen ? "none" : "auto",
      }}>
        {/* Left: icon + filename + AI suggestions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 7, flex: "1 1 0", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "#fef2f2", border: "1.5px solid #fecaca",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <FileText size={16} color="#dc2626" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
          </div>
        </div>

        {/* Center: page navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button onClick={() => goTo(pageNum - 1)} disabled={pageNum <= 1 || loading} style={btnStyle(pageNum <= 1 || loading)} title="Page précédente">
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commitPageInput()}
              onBlur={commitPageInput}
              style={{ width: 38, textAlign: "center", border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "4px 4px", fontSize: 13, fontWeight: 700, color: "#111827", outline: "none", background: "#fff" }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            />
            <span style={{ color: "#9ca3af", fontSize: 13 }}>/</span>
            <span style={{ fontWeight: 600, color: "#6b7280", fontSize: 13, minWidth: 20, textAlign: "center" }}>{numPages || "—"}</span>
          </div>
          <button onClick={() => goTo(pageNum + 1)} disabled={pageNum >= numPages || loading} style={btnStyle(pageNum >= numPages || loading)} title="Page suivante">
            <ChevronRightIcon size={16} />
          </button>
        </div>

        {/* Right: zoom + actions + AI toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 0", justifyContent: "flex-end" }}>
          <button onClick={() => zoom(-0.1)} disabled={scale <= 0.5} style={btnStyle(scale <= 0.5)} title="Zoom arrière"><ZoomOut size={15} /></button>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", minWidth: 42, textAlign: "center", flexShrink: 0 }}>{scalePercent}%</span>
          <button onClick={() => zoom(0.1)} disabled={scale >= 3.0} style={btnStyle(scale >= 3.0)} title="Zoom avant"><ZoomIn size={15} /></button>
          <div style={{ width: 1, height: 22, background: "#e2e8f0", flexShrink: 0 }} />
          <button onClick={toggleFullscreen} style={btnStyle()} title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={handleDownload} style={btnStyle()} title="Télécharger"><Download size={14} /></button>

          {/* AI Chat Toggle — only when AI is ready */}
          {aiEnabled && aiReady && attachmentId && (
            <button
              onClick={() => setChatOpen(o => !o)}
              title={chatOpen ? "Fermer l'assistant IA" : "Ouvrir l'assistant IA"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700,
                background: chatOpen ? "color-mix(in srgb, var(--accent) 10%, white)" : "var(--accent)",
                color: chatOpen ? "var(--accent)" : "#fff",
                transition: "all 0.18s",
                boxShadow: chatOpen ? "inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, white)" : "0 2px 8px color-mix(in srgb, var(--accent) 28%, transparent)",
              }}
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">{chatOpen ? "Fermer IA" : "Tuteur IA"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main area (PDF + Chat panel) ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", background: "#f8fafc" }}>
        {selectedPdfText && (
          <div style={{
            position: "fixed",
            left: selectedPdfText.x,
            top: selectedPdfText.y,
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 8,
            borderRadius: 12,
            background: "#111827",
            color: "#fff",
            boxShadow: "0 12px 32px rgba(15,23,42,0.28)",
          }}>
            <button
              onClick={askAboutSelection}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                border: "none", borderRadius: 9, padding: "8px 10px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 850,
              }}
            >
              <Sparkles size={13} />
              Ask about selection
            </button>
            <button
              onClick={() => {
                setSelectedPdfText(null)
                window.getSelection()?.removeAllRanges()
              }}
              style={{
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", borderRadius: 8, background: "rgba(255,255,255,0.12)",
                color: "#fff", cursor: "pointer",
              }}
              title="Fermer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── PDF pages (scrollable) ── */}
        {false && aiEnabled && aiReady && attachmentId && !loading && !error && (
          <div style={{
            flexShrink: 0,
            padding: "14px 24px 12px",
            borderBottom: "none",
            background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96) 48%, rgba(4,120,87,0.94))",
            color: "#fff",
            boxShadow: "0 18px 45px rgba(15,23,42,0.16)",
          }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                    flexShrink: 0,
                  }}>
                    <Sparkles size={17} color="#a7f3d0" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#ffffff" }}>Tuteur IA du document</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(226,232,240,0.82)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Questions, quiz et exercices construits depuis {name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(o => !o)}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "9px 13px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: chatOpen ? "rgba(255,255,255,0.15)" : "#ffffff",
                    color: chatOpen ? "#ffffff" : "#0f172a",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900,
                    boxShadow: chatOpen ? "none" : "0 8px 24px rgba(2,6,23,0.22)",
                    flexShrink: 0,
                  }}
                >
                  {chatOpen ? <ChevronDown size={14} /> : <MessageSquare size={14} />}
                  {chatOpen ? "Masquer" : "Ouvrir"}
                </button>
              </div>
              {suggestionsVisible && suggestions.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, flex: 1 }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s)}
                        style={{
                          flex: "0 0 auto",
                          maxWidth: 320,
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(255,255,255,0.10)",
                          color: "#f8fafc",
                          fontSize: 12,
                          fontWeight: 750,
                          cursor: "pointer",
                          textAlign: "left",
                          lineHeight: 1.35,
                          backdropFilter: "blur(10px)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setSuggestionsVisible(false)}
                    title="Masquer les suggestions"
                    style={{
                      width: 30, height: 30, borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.72)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          onMouseUp={capturePdfSelection}
          onKeyUp={capturePdfSelection}
          style={{
            width: pdfAreaWidth,
            flex: "0 0 auto",
            overflow: "auto",
            overflowX: chatOpen ? "hidden" : (pdfFitsWidth ? "hidden" : "auto"),
            overflowY: "auto",
            overscrollBehavior: "contain",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "36px 24px",
            boxSizing: "border-box",
            gap: 16,
            transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
            position: "relative",
          }}
        >
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 80 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Chargement du PDF…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", paddingTop: 80 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <X size={24} color="#dc2626" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Impossible d'afficher le PDF</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>{error}</p>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                Ouvrir dans un nouvel onglet →
              </a>
            </div>
          )}

          {!loading && !error && Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              ref={el => { pageRefs.current[i] = el }}
              style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)", borderRadius: 2, background: "#fff", overflow: "hidden", flexShrink: 0, position: "relative" }}
            >
              <canvas ref={el => { canvasRefs.current[i] = el }} style={{ display: "block" }} />
              <div
                ref={el => { textLayerRefs.current[i] = el }}
                className="bi-pdf-text-layer"
                aria-label={`Texte sélectionnable de la page ${i + 1}`}
              />
            </div>
          ))}

          {/* ── AI Suggestion chips (float above scroll bottom) ── */}
          {false && aiEnabled && aiReady && !chatOpen && suggestionsVisible && suggestions.length > 0 && !loading && !error && (
            <div style={{
              position: "sticky", top: 18, zIndex: 20,
              width: "100%", maxWidth: 860,
              padding: "0 8px",
              boxSizing: "border-box",
              pointerEvents: "none",
            }}>
              <div style={{
                background: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(18px)",
                border: "1px solid #dbeafe",
                borderRadius: 14,
                padding: "13px 15px",
                boxShadow: "0 16px 38px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
                pointerEvents: "auto",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: "#ecfeff", border: "1px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Sparkles size={12} color="#0284c7" />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Questions suggérées par l'IA</span>
                  </div>
                  <button
                    onClick={() => setSuggestionsVisible(false)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={13} />
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #dbeafe",
                        background: "#f8fbff",
                        fontSize: 12,
                        fontWeight: 750,
                        color: "#1e3a8a",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        textAlign: "left",
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "#38bdf8"
                        e.currentTarget.style.color = "#075985"
                        e.currentTarget.style.background = "#ecfeff"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "#dbeafe"
                        e.currentTarget.style.color = "#1e3a8a"
                        e.currentTarget.style.background = "#f8fbff"
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Chat panel ── */}
        {attachmentId && (
          <div style={{
            width: chatOpen ? chatPanelWidth : 0,
            flexShrink: 0,
            borderLeft: "1px solid color-mix(in srgb, var(--accent) 18%, #e8ecf3)",
            background: aiMode === "chat"
              ? "linear-gradient(180deg, #fff8ff 0%, #fbf7ff 56%, #f4f0fb 100%)"
              : "#ffffff",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "visible",
            position: "relative",
            zIndex: 30,
            boxShadow: "-18px 0 44px rgba(15,23,42,0.08)",
            opacity: chatOpen ? 1 : 0,
            transform: chatOpen ? "translateX(0)" : "translateX(18px)",
            transition: "width 0.36s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease, transform 0.36s cubic-bezier(0.22,1,0.36,1)",
            pointerEvents: chatOpen ? "auto" : "none",
            willChange: "width, opacity, transform",
          }}>
            <button
              onClick={() => {
                setChatOpen(false)
                setTutorHomeExiting(false)
                setTutorSuggestionMode(null)
              }}
              title="Fermer l'assistant"
              style={{
                position: "absolute",
                top: 24,
                left: 0,
                transform: "translateX(-45%)",
                zIndex: 40,
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg, var(--accent), #c026d3)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "none",
              }}
            >
              <ChevronRightIcon size={19} strokeWidth={3.2} />
            </button>
            {aiMode === "chat" ? (
              <>
            {/* Messages */}
            <div style={{
              flex: 1,
              overflow: showEmptyTutor ? "hidden" : "auto",
              padding: showEmptyTutor ? 0 : "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              order: 2,
              background: "transparent",
              position: "relative",
              animation: showEmptyTutor ? undefined : "tutorChatIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
            }}>
              {showEmptyTutor && (
                renderEmptyTutorHome()
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    alignItems: "stretch",
                    animation: `chatMessageIn 0.42s cubic-bezier(0.22,1,0.36,1) ${Math.min(i * 70, 180)}ms both`,
                  }}
                >
                  {msg.role === "user" ? (
                    <div style={{
                      width: "fit-content",
                      maxWidth: "100%",
                      alignSelf: "flex-end",
                      padding: "10px 14px",
                      background: "var(--accent)",
                      borderRadius: "14px 14px 4px 14px",
                      fontSize: 13, color: "#fff", lineHeight: 1.5, fontWeight: 500,
                      overflowWrap: "anywhere",
                    }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                        <img
                          src="/ai-tutor-avatar.webp"
                          alt=""
                          className="bi-ai-avatar-enter"
                          style={{
                            width: 96,
                            height: 96,
                            borderRadius: 0,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                      {false && msg.aiUsed && (
                        <div style={{
                          alignSelf: "flex-start",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 9px",
                          borderRadius: 999,
                          background: "color-mix(in srgb, var(--accent) 8%, white)",
                          border: "1px solid color-mix(in srgb, var(--accent) 22%, white)",
                          color: "var(--accent)",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.02em",
                        }}>
                          <Sparkles size={11} />
                          IA utilisée: {msg.aiUsed}
                        </div>
                      )}
                      {msg.presentation
                        ? renderTutorPresentation(msg.presentation, msg.content)
                        : (
                          <div style={{
                            width: "100%",
                          }}>
                            {renderAssistantContentBlocks(msg.content, "plain-detail")}
                          </div>
                        )
                      }
                      {false && msg.presentation && msg.content.trim() && (
                        <div style={{
                          marginTop: 4,
                          padding: "13px 14px",
                          borderRadius: 14,
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                        }}>
                          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 950, color: "#0f172a", textTransform: "uppercase" }}>
                            Explication détaillée
                          </p>
                      {parseAssistantContent(msg.content).map((block, bi) => (
                        block.type === "text" ? (
                          <div
                            key={`text-${bi}`}
                            style={{
                              padding: "2px 2px",
                              color: "#334155",
                            }}
                          >
                            {renderAssistantTextBlock(block.text, `text-${bi}`)}
                          </div>
                        ) : (
                          <div
                            key={`code-${bi}`}
                            style={{
                              background: "#f3f4f6",
                              border: "1px solid #e5e7eb",
                              borderRadius: 16,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 12px",
                                borderBottom: "1px solid #e5e7eb",
                                background: "#f8fafc",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Code2 size={14} color="#334155" />
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                                  {block.lang.charAt(0).toUpperCase() + block.lang.slice(1)}
                                </span>
                              </div>
                              <button
                                onClick={() => copyCodeBlock(block.code)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                  background: "#ffffff",
                                  color: "#475569",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Copier le code"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                            <pre
                              style={{
                                margin: 0,
                                padding: "12px 14px 14px",
                                overflowX: "auto",
                                fontSize: 14,
                                lineHeight: 1.75,
                                color: "#111827",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                              }}
                            >
                              <code>{block.code}</code>
                            </pre>
                          </div>
                        )
                      ))}
                        </div>
                      )}
                      {false && !msg.presentation && parseAssistantContent(msg.content).map((block, bi) => (
                        block.type === "text" ? (
                          <div
                            key={`text-${bi}`}
                            style={{
                              padding: "2px 2px",
                              color: "#334155",
                            }}
                          >
                            {renderAssistantTextBlock(block.text, `fallback-text-${bi}`)}
                          </div>
                        ) : (
                          <div
                            key={`code-${bi}`}
                            style={{
                              background: "#f3f4f6",
                              border: "1px solid #e5e7eb",
                              borderRadius: 16,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 12px",
                                borderBottom: "1px solid #e5e7eb",
                                background: "#f8fafc",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Code2 size={14} color="#334155" />
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                                  {block.lang.charAt(0).toUpperCase() + block.lang.slice(1)}
                                </span>
                              </div>
                              <button
                                onClick={() => copyCodeBlock(block.code)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                  background: "#ffffff",
                                  color: "#475569",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Copier le code"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                            <pre
                              style={{
                                margin: 0,
                                padding: "12px 14px 14px",
                                overflowX: "auto",
                                fontSize: 14,
                                lineHeight: 1.75,
                                color: "#111827",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                              }}
                            >
                              <code>{block.code}</code>
                            </pre>
                          </div>
                        )
                      ))}
                      {msg.uncertaintyNote && (
                        <div style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "9px 0 0",
                          borderTop: "1px solid #eef2f7",
                          color: "#64748b",
                        }}>
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            background: "color-mix(in srgb, var(--accent) 8%, white)",
                            color: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: 11,
                            fontWeight: 900,
                            marginTop: 1,
                          }}>
                            i
                          </div>
                          <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.55 }}>
                            <span style={{ fontWeight: 850, color: "#334155" }}>À vérifier dans le support : </span>
                            {msg.uncertaintyNote}
                          </p>
                        </div>
                      )}
                      {!chatLoading && renderPostAnswerSuggestions(msg.suggestions)}
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, animation: "chatMessageIn 0.42s cubic-bezier(0.22,1,0.36,1) 140ms both" }}>
                  <img
                    src="/ai-tutor-thinking.webp"
                    alt=""
                    className="bi-ai-thinking-avatar"
                    style={{
                      width: 91,
                      height: 91,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 850,
                      color: "#7c3aed",
                      animation: "thinkingText 1.35s ease-in-out infinite",
                    }}
                  >
                    Réflexion...
                  </span>
                  <style>{`
                    @keyframes chatMessageIn {
                      0% { opacity: 0; transform: translateY(14px) scale(0.985); }
                      100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes aiAvatarEnter {
                      0% { opacity: 0; transform: translateY(4px) scale(0.96); }
                      100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .bi-ai-avatar-enter {
                      animation: aiAvatarEnter 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
                    }
                    .bi-ai-thinking-avatar {
                      animation: aiThinkingFloat 1.6s ease-in-out infinite;
                    }
                    @keyframes aiThinkingFloat {
                      0%, 100% { transform: translateY(0) scale(1); }
                      50% { transform: translateY(-2px) scale(1.01); }
                    }
                    @keyframes thinkingText {
                      0%, 100% { opacity: 0.55; transform: translateY(0); }
                      50% { opacity: 1; transform: translateY(-1px); }
                    }
                  `}</style>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestion chips inside chat (when no messages yet) */}
            {false && messages.length === 0 && suggestions.length > 0 && (
              <div style={{ padding: "12px 16px 0", display: "flex", flexWrap: "wrap", gap: 6, order: 1 }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    style={{
                      padding: "6px 12px", borderRadius: 99,
                      border: "1px solid #c7d2fe",
                      background: "#eef2ff",
                      fontSize: 11, fontWeight: 600, color: "#4f46e5",
                      cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#e0e7ff"; e.currentTarget.style.borderColor = "#a5b4fc" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.borderColor = "#c7d2fe" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Chat input */}
            <div style={{
              padding: "0 28px 18px",
              borderTop: "none",
              background: "transparent",
              flexShrink: 0,
              order: 3,
              position: "relative",
              zIndex: 10,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#ffffff",
                border: "1px solid #dfe4ee",
                borderRadius: 999,
                padding: "8px 10px 8px 16px",
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: "0 16px 38px rgba(15,23,42,0.10)",
              }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.55)")}
                onBlurCapture={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
              >
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Pose une question sur ce cours…"
                  rows={1}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    resize: "none", fontSize: 14, color: "#0f172a",
                    fontFamily: "inherit", lineHeight: 1.5,
                    maxHeight: 100, overflowY: "auto",
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    border: "none",
                    background: chatInput.trim() && !chatLoading
                      ? "linear-gradient(135deg, var(--accent), #c026d3)"
                      : "linear-gradient(135deg, var(--accent), #c026d3)",
                    cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                    boxShadow: "0 10px 24px color-mix(in srgb, var(--accent) 28%, transparent)",
                    opacity: !chatInput.trim() ? 0.9 : 1,
                  }}
                >
                  {chatLoading
                    ? <Loader2 size={14} color="#64748b" style={{ animation: "spin 1s linear infinite" }} />
                    : <Send size={17} color="#fff" />
                  }
                </button>
              </div>
            </div>
              </>
            ) : aiMode === "quiz" ? (
              renderQuizMode()
            ) : (
              renderCodeMode()
            )}
          </div>
        )}
      </div>
    </div>
  )
}
