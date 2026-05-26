"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronRight, Video, Paperclip, Loader2,
  Check, Pencil, Plus, Trash2, Upload, ExternalLink, GripVertical,
  FileText, FileSpreadsheet, Archive, Film, ArrowLeft, Sparkles,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ──────────────────────────────────────────────────────────────────────

type Lesson        = { id: string; title: string; description: string; content: string; order: number; moduleId: string; instructorId?: string; canEdit?: boolean }
type Module        = { id: string; title: string; order: number }
type VideoItem     = { id: string; lessonId: string; title: string; driveUrl: string; description: string; order?: number; instructorId?: string; canEdit?: boolean }
type Attachment    = { id: string; lessonId?: string; videoId?: string; name: string; url: string | null; order?: number; instructorId?: string; canEdit?: boolean }
type LessonSummary = { id: string; title: string; order: number; moduleId: string }
type AiContextStatus = "none" | "pending" | "ready" | "error"
type AiContextState = { status: AiContextStatus; errorMsg?: string }

type PageData = {
  lesson: Lesson
  module: Module | null
  moduleIndex: number
  lessonIndex: number
  groupId: string
  groupTitle: string
  instructor: { name: string; surname: string } | null
  moduleLessons: LessonSummary[]
  allModules: { id: string; title: string; order: number }[]
  allLessons: LessonSummary[]
  videos: VideoItem[]
  lessonAttachments: Attachment[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDriveThumbnailUrl(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`
  return null
}

type FileIconMeta = { icon: React.ReactNode; bg: string; label: string }

function getFileMeta(name: string): FileIconMeta {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["mp4","mov","avi","mkv"].includes(ext)) return { icon: <Film size={20} color="#7c3aed" />, bg: "#f5f3ff", label: ext.toUpperCase() }
  if (ext === "pdf")                            return { icon: <FileText size={20} color="#dc2626" />, bg: "#fef2f2", label: "PDF" }
  if (["doc","docx"].includes(ext))             return { icon: <FileText size={20} color="#2563eb" />, bg: "#eff6ff", label: ext.toUpperCase() }
  if (["xls","xlsx"].includes(ext))             return { icon: <FileSpreadsheet size={20} color="#16a34a" />, bg: "#f0fdf4", label: ext.toUpperCase() }
  if (["zip","rar","7z"].includes(ext))         return { icon: <Archive size={20} color="#d97706" />, bg: "#fffbeb", label: ext.toUpperCase() }
  return { icon: <Paperclip size={20} color="#6b7280" />, bg: "#f4f6fb", label: ext.toUpperCase() || "FILE" }
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState<{ id: number; type: "ok" | "err"; msg: string }[]>([])
  const push = (type: "ok" | "err", msg: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, msg }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }
  return { toasts, push }
}

// ── FLIP drag helpers ──────────────────────────────────────────────────────────

function snapRects(refs: Map<string, HTMLDivElement>) {
  const m = new Map<string, DOMRect>()
  refs.forEach((el, id) => m.set(id, el.getBoundingClientRect()))
  return m
}

function flipAnimate(refs: Map<string, HTMLDivElement>, before: Map<string, DOMRect>) {
  requestAnimationFrame(() => {
    refs.forEach((el, id) => {
      const b = before.get(id); if (!b) return
      const a = el.getBoundingClientRect()
      const dx = b.left - a.left; const dy = b.top - a.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.style.transition = "none"
      el.style.transform = `translate(${dx}px,${dy}px)`
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.22s cubic-bezier(0.2,0,0,1)"
        el.style.transform = ""
      })
    })
  })
}

// ── Main page ──────────────────────────────────────────────────────────────────

function isPdf(name: string) { return name.split(".").pop()?.toLowerCase() === "pdf" }

export default function LessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>()
  const router = useRouter()
  const { toasts, push } = useToast()

  const [data, setData]       = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  const [title, setTitle]               = useState("")
  const [description, setDescription]   = useState("")
  const [content, setContent]           = useState("")
  const [saveStatus, setSaveStatus]     = useState<"idle" | "pending" | "saving" | "saved">("idle")
  const lessonTimerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoTimerRefs                  = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const latestFields                    = useRef({ title: "", description: "", content: "" })

  const [videos, setVideos]                 = useState<VideoItem[]>([])
  const [dragVideoId, setDragVideoId]       = useState<string | null>(null)
  const videoItemRefs                       = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lessonAtts, setLessonAtts]         = useState<Attachment[]>([])
  const [dragAttId, setDragAttId]           = useState<string | null>(null)
  const attItemRefs                         = useRef<Map<string, HTMLDivElement>>(new Map())
  const [addingVideo, setAddingVideo]       = useState(false)
  const [newVideo, setNewVideo]             = useState({ title: "", driveUrl: "", description: "" })
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [videoEdits, setVideoEdits]         = useState<Record<string, { title: string; driveUrl: string; description: string }>>({})

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [aiEnabled, setAiEnabled]             = useState(false)
  const [aiStatuses, setAiStatuses]           = useState<Record<string, AiContextState>>({})

  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadingFor, setUploadingFor] = useState<{ type: "lesson"; parentId: string } | null>(null)
  const [isDragOver, setIsDragOver]   = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug || !lessonId) return
    setLoading(true)
    fetch(`/api/instructor/groups/${slug}/lessons/${lessonId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        setData(d)
        setTitle(d.lesson.title)
        setDescription(d.lesson.description)
        setContent(d.lesson.content)
        setVideos(d.videos)
        setLessonAtts(d.lessonAttachments)
        if (d.lesson?.moduleId) setExpandedModules(new Set([d.lesson.moduleId]))
      })
      .catch(() => push("err", "Impossible de charger la leçon"))
      .finally(() => setLoading(false))
  }, [slug, lessonId])

  useEffect(() => () => {
    if (lessonTimerRef.current) clearTimeout(lessonTimerRef.current)
    Object.values(videoTimerRefs.current).forEach(clearTimeout)
  }, [])

  // Check AI availability once on mount
  useEffect(() => {
    fetch("/api/ai/status")
      .then(r => r.json())
      .then(d => setAiEnabled(!!d.enabled))
      .catch(() => {})
  }, [])

  // Load AI context statuses for existing PDF attachments whenever the list changes
  useEffect(() => {
    const pdfAtts = lessonAtts.filter(a => isPdf(a.name) && a.id)
    if (pdfAtts.length === 0) return
    for (const att of pdfAtts) {
      fetch(`/api/ai/context?attachmentId=${att.id}`)
        .then(r => r.json())
        .then(ctx => {
          if (ctx.enabled === false) return
          setAiStatuses(prev => ({
            ...prev,
            [att.id]: { status: ctx.status ?? "none", errorMsg: ctx.errorMsg ?? undefined },
          }))
        })
        .catch(() => {})
    }
  }, [lessonAtts])

  // ── Save lesson ──────────────────────────────────────────────────────────────

  async function saveLesson(t: string, d: string, c: string) {
    if (data?.lesson.canEdit === false) return
    setSaveStatus("saving")
    try {
      const res = await fetch(`/api/instructor/groups/${slug}/lessons/${lessonId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, description: d, content: c }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erreur")
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus(s => s === "saved" ? "idle" : s), 2500)
    } catch (e: any) { push("err", e.message); setSaveStatus("idle") }
  }

  function scheduleSave(t: string, d: string, c: string) {
    if (data?.lesson.canEdit === false) return
    latestFields.current = { title: t, description: d, content: c }
    setSaveStatus("pending")
    if (lessonTimerRef.current) clearTimeout(lessonTimerRef.current)
    lessonTimerRef.current = setTimeout(() => {
      const { title: lt, description: ld, content: lc } = latestFields.current
      saveLesson(lt, ld, lc)
    }, 2000)
  }

  function scheduleVideoSave(videoId: string, edits: { title: string; driveUrl: string; description: string }) {
    if (videos.find(v => v.id === videoId)?.canEdit === false) return
    if (videoTimerRefs.current[videoId]) clearTimeout(videoTimerRefs.current[videoId])
    videoTimerRefs.current[videoId] = setTimeout(async () => {
      try {
        const d = await callCurriculum("PATCH", { type: "video", id: videoId, ...edits })
        setVideos(p => p.map(v => v.id === videoId ? d.video : v))
      } catch (e: any) { push("err", e.message) }
    }, 2000)
  }

  async function callCurriculum(method: string, body: object) {
    const res = await fetch(`/api/instructor/groups/${slug}/curriculum`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    const text = await res.text()
    let d: any
    try { d = JSON.parse(text) } catch { throw new Error(`Erreur serveur (${res.status})`) }
    if (!res.ok) throw new Error(d.error || "Erreur")
    return d
  }

  // ── Drag & drop videos ────────────────────────────────────────────────────────

  function handleVideoDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragVideoId || dragVideoId === targetId) return
    const sorted = [...videos].sort((a, b) => (a.order||0) - (b.order||0))
    const fromIdx = sorted.findIndex(v => v.id === dragVideoId)
    const toIdx   = sorted.findIndex(v => v.id === targetId)
    if (sorted[fromIdx]?.canEdit === false || sorted[toIdx]?.canEdit === false) return
    if (fromIdx === toIdx) return
    const targetEl = videoItemRefs.current.get(targetId)
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      if (fromIdx < toIdx && e.clientY < midY) return
      if (fromIdx > toIdx && e.clientY > midY) return
    }
    videoItemRefs.current.forEach(el => { el.style.transition = "none"; el.style.transform = "" })
    const before = snapRects(videoItemRefs.current)
    const reordered = [...sorted]
    const [item] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, item)
    const newOrders = new Map(reordered.map((v, i) => [v.id, i]))
    setVideos(prev => prev.map(v => ({ ...v, order: newOrders.get(v.id) ?? (v.order||0) })))
    flipAnimate(videoItemRefs.current, before)
  }

  function handleVideoDragEnd() {
    setDragVideoId(null)
    const sorted = [...videos].sort((a, b) => (a.order||0) - (b.order||0))
    if (sorted.some(v => v.canEdit === false)) return
    callCurriculum("PATCH", { type: "reorder_videos", order: sorted.map(v => v.id) })
      .catch((e: any) => push("err", e.message))
  }

  // ── Drag & drop attachments ───────────────────────────────────────────────────

  function handleAttDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragAttId || dragAttId === targetId) return
    const fromIdx = lessonAtts.findIndex(a => a.id === dragAttId)
    const toIdx   = lessonAtts.findIndex(a => a.id === targetId)
    if (lessonAtts[fromIdx]?.canEdit === false || lessonAtts[toIdx]?.canEdit === false) return
    if (fromIdx === toIdx) return
    const targetEl = attItemRefs.current.get(targetId)
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      if (fromIdx < toIdx && e.clientY < midY) return
      if (fromIdx > toIdx && e.clientY > midY) return
    }
    attItemRefs.current.forEach(el => { el.style.transition = "none"; el.style.transform = "" })
    const before = snapRects(attItemRefs.current)
    const reordered = [...lessonAtts]
    const [item] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, item)
    setLessonAtts(reordered)
    flipAnimate(attItemRefs.current, before)
  }

  function handleAttDragEnd() {
    setDragAttId(null)
    if (lessonAtts.some(a => a.canEdit === false)) return
    callCurriculum("PATCH", { type: "reorder_lesson_attachments", order: lessonAtts.map(a => a.id) })
      .catch((e: any) => push("err", e.message))
  }

  // ── CRUD videos ───────────────────────────────────────────────────────────────

  async function createVideo() {
    if (data?.lesson.canEdit === false) return
    if (!newVideo.title.trim()) return
    try {
      const d = await callCurriculum("POST", { type: "video", lessonId: data!.lesson.id, ...newVideo })
      setVideos(p => [...p, d.video])
      setNewVideo({ title: "", driveUrl: "", description: "" })
      setAddingVideo(false)
      push("ok", "Vidéo ajoutée")
    } catch (e: any) { push("err", e.message) }
  }

  async function deleteVideo(videoId: string) {
    if (!confirm("Supprimer cette vidéo ?")) return
    try {
      await callCurriculum("DELETE", { type: "video", id: videoId })
      setVideos(p => p.filter(v => v.id !== videoId))
      push("ok", "Vidéo supprimée")
    } catch (e: any) { push("err", e.message) }
  }

  // ── File upload ───────────────────────────────────────────────────────────────

  async function handleFileUpload(file: File) {
    if (data?.lesson.canEdit === false) return
    if (!uploadingFor) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file); fd.append("name", file.name)
    fd.append("type", uploadingFor.type); fd.append("parentId", uploadingFor.parentId)
    try {
      const res = await fetch(`/api/instructor/groups/${slug}/attachments`, { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur upload")
      setLessonAtts(p => [...p, d.attachment])
      push("ok", "Fichier uploadé")

      // Auto-trigger AI context building for PDF uploads (server decides if AI is configured)
      if (file.name.toLowerCase().endsWith(".pdf") && d.attachment?.id && d.attachment?.url) {
        const attId = d.attachment.id as string
        fetch("/api/ai/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attachmentId: attId,
            pdfUrl: d.attachment.url,
            lessonId: data?.lesson.id ?? "",
            groupId: data?.groupId ?? "",
            attachmentName: file.name,
          }),
        }).then(r => r.json()).then(ctx => {
          if (!ctx.ok && ctx.enabled === false) return // AI not configured on server
          setAiEnabled(true)
          setAiStatuses(prev => ({ ...prev, [attId]: { status: "pending" } }))
          // Poll until done
          const pollId = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/ai/context?attachmentId=${attId}`)
              const statusData = await statusRes.json()
              const s: AiContextStatus = statusData.status ?? "none"
              setAiStatuses(prev => ({ ...prev, [attId]: { status: s, errorMsg: statusData.errorMsg ?? undefined } }))
              if (s === "ready" || s === "error" || s === "none") {
                clearInterval(pollId)
                if (s === "ready") push("ok", "Contexte IA généré ✓")
              }
            } catch { clearInterval(pollId) }
          }, 4000)
          setTimeout(() => clearInterval(pollId), 120000)
        }).catch(() => {})
      }
    } catch (e: any) { push("err", e.message) }
    finally { setUploading(false); setUploadingFor(null) }
  }

  function triggerUpload() {
    setUploadingFor({ type: "lesson", parentId: data!.lesson.id })
    fileInputRef.current?.click()
  }

  function retryAiContext(att: Attachment) {
    if (!att.url) return
    setAiStatuses(prev => ({ ...prev, [att.id]: { status: "pending" } }))
    fetch("/api/ai/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachmentId: att.id,
        pdfUrl: att.url,
        lessonId: data?.lesson.id ?? "",
        groupId: data?.groupId ?? "",
        attachmentName: att.name,
      }),
    }).then(r => r.json()).then(ctx => {
      if (!ctx.ok && ctx.enabled === false) return
      const pollId = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/ai/context?attachmentId=${att.id}`)
          const statusData = await statusRes.json()
          const s: AiContextStatus = statusData.status ?? "none"
          setAiStatuses(prev => ({ ...prev, [att.id]: { status: s, errorMsg: statusData.errorMsg ?? undefined } }))
          if (s === "ready" || s === "error" || s === "none") {
            clearInterval(pollId)
            if (s === "ready") push("ok", "Contexte IA généré ✓")
          }
        } catch { clearInterval(pollId) }
      }, 4000)
      setTimeout(() => clearInterval(pollId), 180000)
    }).catch(() => setAiStatuses(prev => ({ ...prev, [att.id]: { status: "error", errorMsg: "Impossible de contacter le serveur." } })))
  }

  async function deleteAttachment(attId: string) {
    try {
      await callCurriculum("DELETE", { type: "lesson_attachment", id: attId })
      setLessonAtts(p => p.filter(a => a.id !== attId))
      push("ok", "Fichier supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) return <LoadingBI />

  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fafafa" }}>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Leçon introuvable</p>
    </div>
  )

  const { module, moduleIndex, lessonIndex, groupTitle, instructor, moduleLessons } = data
  const modulePad    = String(moduleIndex).padStart(2, "0")
  const lessonPad    = String(lessonIndex).padStart(2, "0")
  const sortedVideos = [...videos].sort((a, b) => (a.order||0) - (b.order||0))
  const canEditLesson = data.lesson.canEdit !== false

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    border: "1.5px solid #e2e8f0", borderRadius: 9,
    fontSize: 13, color: "#374151",
    outline: "none", fontFamily: "inherit",
    background: "#fff", boxSizing: "border-box",
    transition: "border-color 0.15s",
  }

  const smallLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
    textTransform: "uppercase", color: "#6b7280",
    display: "block", marginBottom: 5,
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>

      <input ref={fileInputRef} type="file" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = "" }} />

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: t.type === "ok" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${t.type === "ok" ? "#6ee7b7" : "#fca5a5"}`,
            color: t.type === "ok" ? "#065f46" : "#991b1b",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {t.type === "ok" ? <Check size={13} /> : "×"} {t.msg}
          </div>
        ))}
      </div>

      {/* ── Header — matches groups/[slug] exactly ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff",
        borderBottom: "1px solid #f1f5f9",
        padding: "14px 28px 0",
        display: "flex", flexDirection: "column",
      }}>
        {/* Row 1: breadcrumb + save status */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link href="/instructor-dashboard/overview" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>
                Accueil
              </Link>
              <ChevronRight size={11} style={{ color: "#9ca3af" }} />
              <Link href="/instructor-dashboard/groups" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>
                Formations
              </Link>
              <ChevronRight size={11} style={{ color: "#9ca3af" }} />
              <Link href={`/instructor-dashboard/groups/${slug}`} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {groupTitle || slug}
              </Link>
              <ChevronRight size={11} style={{ color: "#9ca3af" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {title || "Leçon"}
              </span>
            </div>
          </div>

          {/* Save status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 14, minHeight: 30 }}>
            {saveStatus === "pending" && (
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Modification en attente…</span>
            )}
            {saveStatus === "saving" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                <Loader2 size={11} className="animate-spin" /> Enregistrement…
              </span>
            )}
            {saveStatus === "saved" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                <Check size={11} /> Enregistré
              </span>
            )}
          </div>
        </div>

        {/* Row 2: lesson title + module info */}
        <div style={{ marginTop: 8, paddingBottom: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
            {title || "Leçon"}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0" }}>
            {module?.title || "Module"} · Leçon {lessonPad}
          </p>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ padding: "24px 28px 64px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        {/* ══ LEFT: title edit + files + videos ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Lesson info card */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 2, borderRadius: 99, background: "var(--accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
                Module {modulePad} · Leçon {lessonPad}
              </span>
            </div>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); scheduleSave(e.target.value, description, content) }}
              disabled={!canEditLesson}
              placeholder="Titre de la leçon…"
              style={{ display: "block", width: "100%", fontSize: 26, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2, border: "none", outline: "none", background: "transparent", fontFamily: "var(--ff-display,'Syne',sans-serif)", padding: 0, marginBottom: 10, boxSizing: "border-box" }}
            />
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); scheduleSave(title, e.target.value, content) }}
              disabled={!canEditLesson}
              rows={2}
              placeholder="Description de la leçon…"
              style={{ display: "block", width: "100%", fontSize: 14, color: "#4b5563", lineHeight: 1.7, border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: "inherit", padding: 0, boxSizing: "border-box" }}
            />
          </div>

          {/* ── Fichiers ── */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {/* Section header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Paperclip size={14} color="#6b7280" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Fichiers</span>
                {lessonAtts.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f1f5f9", borderRadius: 99, padding: "2px 8px" }}>
                    {lessonAtts.length}
                  </span>
                )}
              </div>
              {canEditLesson && <button
                onClick={triggerUpload}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "color-mix(in oklch, var(--accent) 9%, white)", border: "1.5px solid color-mix(in oklch, var(--accent) 22%, white)", borderRadius: 9, fontSize: 12, fontWeight: 700, color: "var(--accent)", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 14%, white)")}
                onMouseLeave={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 9%, white)")}
              >
                <Upload size={12} /> Ajouter
              </button>}
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Drop zone */}
              <div
                onClick={canEditLesson ? triggerUpload : undefined}
                onDragOver={e => { if (!canEditLesson) return; e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setIsDragOver(false)
                  if (!canEditLesson) return
                  const f = e.dataTransfer.files[0]
                  if (f) { setUploadingFor({ type: "lesson", parentId: data!.lesson.id }); handleFileUpload(f) }
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px",
                  background: isDragOver ? "color-mix(in oklch, var(--accent) 3%, transparent)" : "#f8fafc",
                  border: `1.5px dashed ${isDragOver ? "var(--accent)" : "#e2e8f0"}`,
                  borderRadius: 10, cursor: canEditLesson ? "pointer" : "default", transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in oklch, var(--accent) 50%, white)"; (e.currentTarget as HTMLDivElement).style.background = "color-mix(in oklch, var(--accent) 2%, transparent)" }}
                onMouseLeave={e => { if (!isDragOver) { (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" } }}
              >
                {uploading ? <Loader2 size={18} color="var(--accent)" className="animate-spin" /> : <Upload size={18} color="#9ca3af" strokeWidth={1.5} />}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>
                    {uploading ? "Upload en cours…" : "Glissez un fichier ou cliquez"}
                  </p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>PDF, Word, Excel, ZIP…</p>
                </div>
              </div>

              {/* File items */}
              {lessonAtts.map(att => {
                const meta          = getFileMeta(att.name)
                const isAttDragging = dragAttId === att.id
                const pdfUrl        = att.url && isPdf(att.name)
                  ? `/instructor-dashboard/groups/${slug}/pdf-viewer?url=${encodeURIComponent(att.url)}&name=${encodeURIComponent(att.name)}&groupTitle=${encodeURIComponent(data?.groupTitle || "")}&lessonTitle=${encodeURIComponent(title)}&lessonId=${lessonId}`
                  : null
                return (
                  <div
                    key={att.id}
                    ref={el => { if (el) attItemRefs.current.set(att.id, el); else attItemRefs.current.delete(att.id) }}
                    draggable={att.canEdit !== false}
                    onDragStart={e => { if (att.canEdit === false) return; setDragAttId(att.id); e.currentTarget.style.opacity = "0.4" }}
                    onDragEnd={e => { e.currentTarget.style.opacity = "1"; handleAttDragEnd() }}
                    onDragOver={e => handleAttDragOver(e, att.id)}
                    style={{ display: "flex", alignItems: "center", gap: 0, background: "transparent", transition: "background 0.12s", opacity: isAttDragging ? 0.4 : 1, transform: "translate3d(0,0,0)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Grip */}
                    <div style={{ width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: att.canEdit === false ? "default" : "grab", color: "#d1d5db", alignSelf: "stretch", flexShrink: 0 }}>
                      {att.canEdit !== false && <GripVertical size={16} />}
                    </div>
                    <div
                      onClick={() => { if (pdfUrl) router.push(pdfUrl) }}
                      style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, cursor: pdfUrl ? "pointer" : "default" }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, padding: "14px 16px" }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
                          {att.name}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", margin: 0, letterSpacing: "0.04em" }}>
                            {meta.label}
                          </p>
                          {aiEnabled && isPdf(att.name) && (() => {
                            const ai = aiStatuses[att.id]
                            const s = ai?.status
                            if (!s || s === "none") return (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Sparkles size={9} /> IA non indexée
                              </span>
                            )
                            if (s === "pending") return (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 99, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Loader2 size={9} className="animate-spin" />
                                Analyse IA en cours…
                              </span>
                            )
                            if (s === "ready") return (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 99, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Sparkles size={9} /> Contexte IA prêt
                              </span>
                            )
                            if (s === "error") return (
                              <span style={{ display: "inline-flex", flexDirection: "column", gap: 3 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  ✕ Erreur IA
                                  {ai?.errorMsg && (
                                    <span style={{ fontWeight: 400, color: "#b91c1c", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ai.errorMsg}>
                                      — {ai.errorMsg}
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={e => { e.stopPropagation(); retryAiContext(att) }}
                                  style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "underline" }}
                                >
                                  ↻ Réessayer
                                </button>
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 16 }}>
                      {att.url && !pdfUrl && (
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#9ca3af", textDecoration: "none", transition: "all 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#e8ecf3"; (e.currentTarget as HTMLAnchorElement).style.color = "#374151" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af" }}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {att.canEdit !== false && <button
                        onClick={() => deleteAttachment(att.id)}
                        style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", transition: "all 0.12s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af" }}
                      >
                        <Trash2 size={14} />
                      </button>}
                    </div>
                  </div>
                )
              })}

              {lessonAtts.length === 0 && (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "4px 0", margin: 0 }}>
                  Aucun fichier pour l'instant
                </p>
              )}
            </div>
          </div>

          {/* ── Vidéos ── */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Video size={14} color="#6b7280" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Vidéos</span>
                {videos.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f1f5f9", borderRadius: 99, padding: "2px 8px" }}>
                    {videos.length}
                  </span>
                )}
              </div>
              {canEditLesson && !addingVideo && (
                <button
                  onClick={() => setAddingVideo(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "color-mix(in oklch, var(--accent) 9%, white)", border: "1.5px solid color-mix(in oklch, var(--accent) 22%, white)", borderRadius: 9, fontSize: 12, fontWeight: 700, color: "var(--accent)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 14%, white)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 9%, white)")}
                >
                  <Plus size={12} /> Ajouter
                </button>
              )}
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

              {sortedVideos.map((video, idx) => {
                const isEditing  = editingVideoId === video.id
                const edits      = videoEdits[video.id] || { title: video.title, driveUrl: video.driveUrl, description: video.description }
                const isDragging = dragVideoId === video.id
                const thumb      = getDriveThumbnailUrl(video.driveUrl)
                const vidViewerUrl = video.driveUrl ? `/instructor-dashboard/groups/${slug}/video-viewer?url=${encodeURIComponent(video.driveUrl)}&title=${encodeURIComponent(video.title)}&groupTitle=${encodeURIComponent(data?.groupTitle || "")}&lessonTitle=${encodeURIComponent(title)}&lessonId=${lessonId}` : null

                return (
                  <div
                    key={video.id}
                    ref={el => { if (el) videoItemRefs.current.set(video.id, el); else videoItemRefs.current.delete(video.id) }}
                    draggable={!isEditing && video.canEdit !== false}
                    onDragStart={e => { if (video.canEdit === false) return; setDragVideoId(video.id); e.currentTarget.style.opacity = "0.4" }}
                    onDragEnd={e => { e.currentTarget.style.opacity = "1"; handleVideoDragEnd() }}
                    onDragOver={e => handleVideoDragOver(e, video.id)}
                    style={{ opacity: isDragging ? 0.4 : 1, transform: "translate3d(0,0,0)", background: "transparent", overflow: "hidden" }}
                  >
                    {isEditing ? (
                      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <label style={smallLabel}>Titre</label>
                          <input value={edits.title}
                            onChange={e => { const n = { ...edits, title: e.target.value }; setVideoEdits(p => ({ ...p, [video.id]: n })); scheduleVideoSave(video.id, n) }}
                            style={inputStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                          />
                        </div>
                        <div>
                          <label style={smallLabel}>Lien Google Drive</label>
                          <input value={edits.driveUrl}
                            onChange={e => { const n = { ...edits, driveUrl: e.target.value }; setVideoEdits(p => ({ ...p, [video.id]: n })); scheduleVideoSave(video.id, n) }}
                            placeholder="https://drive.google.com/file/d/…"
                            style={inputStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                          />
                        </div>
                        <div>
                          <label style={smallLabel}>Description</label>
                          <textarea value={edits.description}
                            onChange={e => { const n = { ...edits, description: e.target.value }; setVideoEdits(p => ({ ...p, [video.id]: n })); scheduleVideoSave(video.id, n) }}
                            rows={2} style={{ ...inputStyle, resize: "vertical" }}
                            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                          />
                        </div>
                        <button onClick={() => setEditingVideoId(null)}
                          style={{ alignSelf: "flex-start", padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
                          Fermer
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 0 }}
                        onMouseEnter={e => (e.currentTarget.parentElement!.style.background = "#f1f5f9")}
                        onMouseLeave={e => (e.currentTarget.parentElement!.style.background = "transparent")}
                      >
                        {/* Grip */}
                        <div style={{ width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: video.canEdit === false ? "default" : "grab", color: "#d1d5db", alignSelf: "stretch", flexShrink: 0 }}>
                          {video.canEdit !== false && <GripVertical size={16} />}
                        </div>

                        {/* Thumbnail */}
                        <div onClick={() => { if (vidViewerUrl) router.push(vidViewerUrl) }}
                          style={{ display: "block", flexShrink: 0, textDecoration: "none", cursor: vidViewerUrl ? "pointer" : "default" }}>
                          <div style={{ width: 200, aspectRatio: "16/9", background: "#e8ecf3", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {thumb
                              ? <img src={thumb} alt={video.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                              : <Video size={24} color="#9ca3af" strokeWidth={1.5} />
                            }
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0, padding: "18px 20px" }}>
                          <div onClick={() => { if (vidViewerUrl) router.push(vidViewerUrl) }}
                            style={{ textDecoration: "none", cursor: vidViewerUrl ? "pointer" : "default" }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--ff-display,'Syne',sans-serif)", transition: "color 0.12s" }}
                               onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                               onMouseLeave={e => (e.currentTarget.style.color = "#111827")}>
                              {idx + 1}. {video.title}
                            </p>
                          </div>
                          {video.description && (
                            <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {video.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 16 }}>
                          {video.canEdit !== false && <button
                            onClick={() => { setEditingVideoId(video.id); setVideoEdits(p => ({ ...p, [video.id]: { title: video.title, driveUrl: video.driveUrl, description: video.description } })) }}
                            style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", transition: "all 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#e8ecf3"; (e.currentTarget as HTMLButtonElement).style.color = "#374151" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af" }}
                          >
                            <Pencil size={13} />
                          </button>}
                          {video.canEdit !== false && <button
                            onClick={() => deleteVideo(video.id)}
                            style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", transition: "all 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af" }}
                          >
                            <Trash2 size={13} />
                          </button>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add video form */}
              {canEditLesson && addingVideo && (
                <div style={{ background: "#f8fafc", borderRadius: 10, border: "1.5px dashed color-mix(in oklch, var(--accent) 35%, #e2e8f0)", padding: "18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Nouvelle vidéo</p>
                  <div>
                    <label style={smallLabel}>Titre *</label>
                    <input value={newVideo.title} onChange={e => setNewVideo(p => ({ ...p, title: e.target.value }))}
                      placeholder="Ex: Introduction au chapitre" style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")} />
                  </div>
                  <div>
                    <label style={smallLabel}>Lien Google Drive</label>
                    <input value={newVideo.driveUrl} onChange={e => setNewVideo(p => ({ ...p, driveUrl: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/…" style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")} />
                  </div>
                  <div>
                    <label style={smallLabel}>Description <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optionnelle)</span></label>
                    <textarea value={newVideo.description} onChange={e => setNewVideo(p => ({ ...p, description: e.target.value }))}
                      rows={2} placeholder="Résumé…" style={{ ...inputStyle, resize: "vertical" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={createVideo}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--accent)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                      <Plus size={13} /> Ajouter
                    </button>
                    <button onClick={() => { setAddingVideo(false); setNewVideo({ title: "", driveUrl: "", description: "" }) }}
                      style={{ padding: "9px 16px", background: "#f1f5f9", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {videos.length === 0 && !addingVideo && (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "4px 0", margin: 0 }}>
                  Aucune vidéo pour l'instant
                </p>
              )}
            </div>
          </div>

        </div>{/* end left */}

        {/* ══ RIGHT sidebar ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 104, alignSelf: "start" }}>

          {/* Instructor card */}
          {instructor && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Formateur</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "color-mix(in oklch, var(--accent) 10%, transparent)", border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)" }}>
                  {[instructor.name[0], instructor.surname[0]].filter(Boolean).join("").toUpperCase() || "?"}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>
                    {[instructor.name, instructor.surname].filter(Boolean).join(" ")}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0" }}>Formateur</p>
                </div>
              </div>
            </div>
          )}

          {/* Full programme nav */}
          {data.allModules.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

              {/* Header */}
              <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>Programme</span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{data.allModules.length} module{data.allModules.length !== 1 ? "s" : ""}</span>
                <span style={{ color: "#e2e8f0", fontSize: 11 }}>·</span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{data.allLessons.length} leçon{data.allLessons.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Modules */}
              <div style={{ padding: "6px 0 6px" }}>
                {data.allModules.map((mod, modIdx) => {
                  const modLessons = data.allLessons.filter(l => l.moduleId === mod.id)
                  const isExpanded = expandedModules.has(mod.id)
                  const num = String(modIdx + 1).padStart(2, "0")
                  const hasCurrentLesson = modLessons.some(l => l.id === data.lesson.id)

                  return (
                    <div key={mod.id}>
                      {/* Module row */}
                      <div
                        onClick={() => setExpandedModules(prev => { const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s })}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", cursor: "pointer", transition: "background 0.12s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${hasCurrentLesson ? "var(--accent)" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 800, color: hasCurrentLesson ? "var(--accent)" : "#9ca3af", letterSpacing: "-0.02em" }}>
                          {num}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {mod.title}
                        </span>
                        <span style={{ fontSize: 10, color: "#b0b7c8", fontWeight: 500, flexShrink: 0 }}>
                          {modLessons.length}
                        </span>
                        <ChevronRight size={12} color="#d1d5db" style={{ flexShrink: 0, transition: "transform 0.18s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }} />
                      </div>

                      {/* Lesson rows */}
                      {isExpanded && modLessons.map((l, lIdx) => {
                        const isCurrent = l.id === data.lesson.id
                        return (
                          <div
                            key={l.id}
                            onClick={() => router.push(`/instructor-dashboard/groups/${slug}/lessons/${l.id}`)}
                            style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 18px 7px 54px", background: isCurrent ? "color-mix(in oklch, var(--accent) 7%, transparent)" : "transparent", cursor: "pointer", transition: "background 0.12s", borderLeft: isCurrent ? "2px solid var(--accent)" : "2px solid transparent" }}
                            onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                            onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = isCurrent ? "color-mix(in oklch, var(--accent) 7%, transparent)" : "transparent" }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? "var(--accent)" : "#c4c9d4", minWidth: 16, flexShrink: 0 }}>
                              {String(lIdx + 1).padStart(2, "0")}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "color-mix(in oklch, var(--accent) 85%, black)" : "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {l.title}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>{/* end right */}

      </div>
    </div>
  )
}
