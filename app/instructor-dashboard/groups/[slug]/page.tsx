"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronRight, ChevronDown, Plus, Trash2, Save,
  BookOpen, Layers, Users, GraduationCap, Video,
  Paperclip, FileText, X, Check, Loader2, Upload,
  Play, ExternalLink, Pencil, AlertCircle, File,
  FolderOpen, LayoutList, Clock, Calendar,
  RotateCcw, ChevronLeft, GripVertical, ClipboardList,
  ClipboardCheck,
} from "lucide-react"
import GroupKpiCard from "@/components/groups/GroupKpiCard"
import LoadingBI from "@/components/LoadingBI"

// ── Types ──────────────────────────────────────────────────────────────────────

type GroupStatus = "not_started" | "in_progress" | "completed"
type Tab = "overview" | "etudiants" | "seances"
const TAB_ORDER: Tab[] = ["overview", "etudiants", "seances"]

function parseTab(value: string | null): Tab | null {
  if (!value) return null
  return TAB_ORDER.includes(value as Tab) ? (value as Tab) : null
}

type Program = {
  id: string
  type: "course" | "bootcamp"
  title: string
  shortDescription: string
  longDescription: string
  coverImage: string | null
}

type Group = {
  id: string
  title: string
  status: GroupStatus
  programType: "course" | "bootcamp"
  studentIds: string[]
  students: { id: string; name: string; surname: string; username: string; email: string; avatar: string | null }[]
  instructor: { id: string; name: string; surname: string; avatar?: string | null } | null
  program: Program | null
  nextSession?: {
    id: string
    title: string | null
    date: string
    start_time: string
    mode: string
    joinUrl: string | null
  } | null
  nextSessions?: {
    id: string
    title: string | null
    date: string
    start_time: string
    mode: string
    joinUrl: string | null
  }[] | null
  pastSessions?: {
    id: string
    title: string | null
    date: string
    start_time: string
    mode: string
    joinUrl: string | null
    recordingUrl: string | null
    googleEventId: string | null
  }[] | null
}

type Module     = { id: string; title: string; order: number; description: string }
type Lesson     = { id: string; moduleId: string; title: string; order: number; description: string; content: string }
type Video      = { id: string; lessonId: string; title: string; driveUrl: string; description: string }
type Attachment = { id: string; lessonId?: string; videoId?: string; name: string; url: string | null }

type HomeworkItem = {
  id: string
  moduleId: string
  title: string
  text: string
  deadline: string | null
  attachments: { id: string; name: string; url: string | null }[]
  submissionsCount: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<GroupStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  not_started: { label: "Pas commencé", dot: "#94a3b8", text: "#475569", bg: "#f1f5f9",  border: "#e2e8f0" },
  in_progress:  { label: "En cours",    dot: "var(--accent)", text: "color-mix(in oklch, var(--accent) 85%, black)", bg: "color-mix(in oklch, var(--accent) 12%, white)",  border: "color-mix(in oklch, var(--accent) 45%, white)" },
  completed:    { label: "Terminé",     dot: "#22c55e", text: "#15803d", bg: "#dcfce7",  border: "#86efac" },
}

const AVATAR_COLORS = ["var(--accent)","#8b5cf6","#7c3aed","#10b981","#f59e0b","#ef4444","#ec4899","#a78bfa"]

function getDriveEmbedUrl(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  if (url.includes("drive.google.com")) return url
  return null
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["mp4","mov","avi","mkv"].includes(ext)) return "🎬"
  if (["pdf"].includes(ext)) return "📄"
  if (["doc","docx"].includes(ext)) return "📝"
  if (["xls","xlsx"].includes(ext)) return "📊"
  if (["ppt","pptx"].includes(ext)) return "📑"
  if (["zip","rar","7z"].includes(ext)) return "📦"
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "🖼️"
  return "📎"
}

function initials(name: string, surname: string) {
  return ((name?.[0] || "") + (surname?.[0] || "")).toUpperCase() || "?"
}

function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

function sessMinutesUntil(sess: { date: string; start_time: string } | null | undefined): number {
  if (!sess) return Infinity
  const [y, m, d] = sess.date.split("-").map(Number)
  const [h, min] = (sess.start_time || "00:00").split(":").map(Number)
  return (new Date(y, m - 1, d, h, min).getTime() - Date.now()) / 60000
}

function todayYMD() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
}

const moduleExpandVariants = {
  open: {
    height: "auto",
    opacity: 1,
    y: 0,
    borderTopColor: "#f0f1f5",
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  collapsed: {
    height: 0,
    opacity: 0,
    y: -8,
    borderTopColor: "transparent",
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  },
}

// ── Toast ──────────────────────────────────────────────────────────────────────

type Toast = { id: string; type: "ok" | "err"; text: string }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((type: "ok" | "err", text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, type, text }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  return { toasts, push }
}

function isPdf(name: string) { return name.split(".").pop()?.toLowerCase() === "pdf" }

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { slug: groupId } = useParams<{ slug: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toasts, push } = useToast()

  // Data
  const [group,              setGroup]              = useState<Group | null>(null)
  const [modules,            setModules]            = useState<Module[]>([])
  const [lessons,            setLessons]            = useState<Lesson[]>([])
  const [videos,             setVideos]             = useState<Video[]>([])
  const [lessonAttachments,  setLessonAttachments]  = useState<Attachment[]>([])
  const [videoAttachments,   setVideoAttachments]   = useState<Attachment[]>([])
  const [moduleVideos,       setModuleVideos]       = useState<{ id: string; moduleId: string; title: string; driveUrl: string; description: string; order: number }[]>([])
  const [moduleAttachments,  setModuleAttachments]  = useState<{ id: string; moduleId: string; name: string; url: string | null; order?: number }[]>([])
  const [resourceMode,       setResourceMode]       = useState<"default" | "custom">("custom")

  const [todaySession, setTodaySession] = useState<{ id: string; title: string | null; date: string; start_time: string; mode: string; joinUrl: string | null } | null>(null)

  // UI
  const [loading,              setLoading]              = useState(true)
  const [saving,               setSaving]               = useState(false)
  const [switchingResources,   setSwitchingResources]   = useState(false)
  const [generatingMeet,       setGeneratingMeet]       = useState(false)
  const [syncingRecordings,    setSyncingRecordings]    = useState<Record<string, boolean>>({})
  const [expandedModules,      setExpandedModules]      = useState<Set<string>>(new Set())
  const [selectedLessonId,     setSelectedLessonId]     = useState<string | null>(null)
  const [activeContentTab,     setActiveContentTab]     = useState<"contenu" | "videos" | "fichiers">("contenu")
  const [activeTab,            setActiveTab]            = useState<Tab>("overview")

  // Inline creation
  const [addingModule,           setAddingModule]           = useState(false)
  const [newModuleTitle,         setNewModuleTitle]         = useState("")
  const [addingLessonForModule,  setAddingLessonForModule]  = useState<string | null>(null)
  const [newLessonTitle,         setNewLessonTitle]         = useState("")

  // Lesson editing
  const [editingLesson,  setEditingLesson]  = useState<Lesson | null>(null)
  const [lessonDirty,    setLessonDirty]    = useState(false)

  // Module inline title edit
  const [editingModuleId,    setEditingModuleId]    = useState<string | null>(null)
  const [editingModuleTitle, setEditingModuleTitle] = useState("")

  // Drag-and-drop reorder
  const [dragModuleId, setDragModuleId] = useState<string | null>(null)
  const [dragModuleContentKey, setDragModuleContentKey] = useState<string | null>(null)
  const [draggingLabel, setDraggingLabel] = useState<string>("")
  const moduleItemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const moduleContentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const ghostRef       = useRef<HTMLDivElement>(null)

  // Video management
  const [addingVideoForLesson, setAddingVideoForLesson] = useState<string | null>(null)
  const [newVideo,             setNewVideo]             = useState({ title: "", driveUrl: "", description: "" })
  const [editingVideoId,       setEditingVideoId]       = useState<string | null>(null)
  const [videoEdits,           setVideoEdits]           = useState<Record<string, { title: string; driveUrl: string; description: string }>>({})

  // Module-level resources
  const [addingModuleVideoFor,  setAddingModuleVideoFor]  = useState<string | null>(null)
  const [newModuleVideo,        setNewModuleVideo]        = useState({ title: "", driveUrl: "", description: "" })
  const moduleFileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingModuleFor, setUploadingModuleFor] = useState<string | null>(null)

  // File upload
  const fileInputRef      = useRef<HTMLInputElement>(null)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFor, setUploadingFor] = useState<{ type: "lesson" | "video"; parentId: string } | null>(null)
  const [uploading,    setUploading]    = useState(false)

  // Homework
  const [homework,                setHomework]                = useState<HomeworkItem[]>([])
  const [addingHomeworkFor,       setAddingHomeworkFor]       = useState<string | null>(null)
  const [editingHomeworkId,       setEditingHomeworkId]       = useState<string | null>(null)
  const [expandedHomeworkId,      setExpandedHomeworkId]      = useState<string | null>(null)
  const [homeworkForm,            setHomeworkForm]            = useState({ title: "", text: "", deadline: "" })
  const [savingHomework,          setSavingHomework]          = useState(false)
  const [uploadingHwAttFor,       setUploadingHwAttFor]       = useState<string | null>(null)
  const hwFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tabFromQuery = parseTab(searchParams.get("view")) ?? "overview"
    setActiveTab(prev => (prev === tabFromQuery ? prev : tabFromQuery))
  }, [searchParams])

  const setActiveTabWithRoute = useCallback((tab: Tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)

    const params = new URLSearchParams(searchParams.toString())
    if (tab === "overview") params.delete("view")
    else params.set("view", tab)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [activeTab, pathname, router, searchParams])

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!groupId) return
    const load = async () => {
      setLoading(true)
      try {
        const [gRes, cRes, hwRes] = await Promise.all([
          fetch(`/api/instructor/groups/${groupId}`),
          fetch(`/api/instructor/groups/${groupId}/curriculum`),
          fetch(`/api/instructor/groups/${groupId}/homework`),
        ])
        if (gRes.ok) {
          const d = await gRes.json()
          if (d.ok) {
            setGroup({ ...d.group, nextSession: d.nextSession, nextSessions: d.nextSessions, pastSessions: d.pastSessions })
            setTodaySession(d.todaySession || null)
          }
        }
        if (cRes.ok) {
          const d = await cRes.json()
          if (d.ok) {
            setModules(d.modules || [])
            setLessons(d.lessons || [])
            setVideos(d.videos || [])
            setLessonAttachments(d.lessonAttachments || [])
            setVideoAttachments(d.videoAttachments || [])
            setModuleVideos(d.moduleVideos || [])
            setModuleAttachments(d.moduleAttachments || [])
            setResourceMode(d.resourceMode === "default" ? "default" : "custom")
            if ((d.modules || []).length > 0) setExpandedModules(new Set([(d.modules[0] as Module).id]))
          }
        }
        if (hwRes.ok) {
          const d = await hwRes.json()
          if (d.ok) setHomework(d.homework || [])
        }
      } catch { push("err", "Impossible de charger le groupe") }
      finally  { setLoading(false) }
    }
    load()
  }, [groupId])

  const selectLesson = (lesson: Lesson) => {
    router.push(`/instructor-dashboard/groups/${groupId}/lessons/${lesson.id}`)
  }

  async function generateMeet() {
    const sess = group?.nextSession ?? todaySession
    if (!sess || !sess.id || generatingMeet) return
    setGeneratingMeet(true)
    try {
      const res = await fetch("/api/instructor/sessions/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sess.id, instructorId: group?.instructor?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur de génération")
      if (group?.nextSession?.id === sess.id) {
        setGroup(p => p && p.nextSession ? { ...p, nextSession: { ...p.nextSession, joinUrl: data.joinUrl } } : p)
      } else {
        setTodaySession(p => p ? { ...p, joinUrl: data.joinUrl } : p)
      }
      push("ok", "Lien Google Meet généré !")
    } catch (err: any) { push("err", err.message) }
    finally { setGeneratingMeet(false) }
  }

  async function syncRecording(sessionId: string) {
    if (syncingRecordings[sessionId]) return
    setSyncingRecordings(p => ({ ...p, [sessionId]: true }))
    try {
      const res = await fetch("/api/instructor/sessions/sync-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, instructorId: group?.instructor?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur de synchronisation")
      setGroup(p => p?.pastSessions ? { ...p, pastSessions: p.pastSessions.map(s => s.id === sessionId ? { ...s, recordingUrl: data.recordingUrl } : s) } : p)
      push("ok", "Enregistrement synchronisé !")
    } catch (err: any) { push("err", err.message) }
    finally { setSyncingRecordings(p => ({ ...p, [sessionId]: false })) }
  }

  // ── Curriculum helpers ──────────────────────────────────────────────────────

  async function callCurriculum(method: string, body: object) {
    const res = await fetch(`/api/instructor/groups/${groupId}/curriculum`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    const text = await res.text()
    let d: any
    try { d = JSON.parse(text) } catch { throw new Error(`Erreur serveur (${res.status})`) }
    if (!res.ok) throw new Error(d.error || "Erreur")
    return d
  }

  async function useCustomResources() {
    if (switchingResources) return
    setSwitchingResources(true)
    try {
      await callCurriculum("POST", { type: "clone_course_defaults" })
      const res = await fetch(`/api/instructor/groups/${groupId}/curriculum`)
      const d = await res.json()
      if (!res.ok || !d.ok) throw new Error(d.error || "Erreur")
      setModules(d.modules || [])
      setLessons(d.lessons || [])
      setVideos(d.videos || [])
      setLessonAttachments(d.lessonAttachments || [])
      setVideoAttachments(d.videoAttachments || [])
      setModuleVideos(d.moduleVideos || [])
      setModuleAttachments(d.moduleAttachments || [])
      setResourceMode("custom")
      if ((d.modules || []).length > 0) setExpandedModules(new Set([(d.modules[0] as Module).id]))
      push("ok", "Ressources personnalisees activees")
    } catch (e: any) {
      push("err", e.message)
    } finally {
      setSwitchingResources(false)
    }
  }

  async function createModule() {
    const title = newModuleTitle.trim()
    if (!title) return
    try {
      const d = await callCurriculum("POST", { type: "module", title })
      setModules(p => [...p, d.module])
      setExpandedModules(p => new Set([...p, d.module.id]))
      setNewModuleTitle(""); setAddingModule(false)
      push("ok", "Module créé")
    } catch (e: any) { push("err", e.message) }
  }

  async function saveModuleTitle(moduleId: string) {
    const title = editingModuleTitle.trim()
    if (!title) return setEditingModuleId(null)
    try {
      const d = await callCurriculum("PATCH", { type: "module", id: moduleId, title })
      setModules(p => p.map(m => m.id === moduleId ? d.module : m))
      setEditingModuleId(null)
    } catch (e: any) { push("err", e.message) }
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Supprimer ce module et toutes ses leçons ?")) return
    try {
      await callCurriculum("DELETE", { type: "module", id: moduleId })
      setModules(p => p.filter(m => m.id !== moduleId))
      setLessons(p => p.filter(l => l.moduleId !== moduleId))
      if (selectedLessonId && lessons.find(l => l.moduleId === moduleId && l.id === selectedLessonId)) {
        setSelectedLessonId(null); setEditingLesson(null)
      }
      push("ok", "Module supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  // ── FLIP drag helpers ────────────────────────────────────────────────────────

  function snapTops(refs: Map<string, HTMLDivElement>) {
    const m = new Map<string, number>()
    refs.forEach((el, id) => m.set(id, el.getBoundingClientRect().top))
    return m
  }

  function flipAnimate(refs: Map<string, HTMLDivElement>, before: Map<string, number>) {
    requestAnimationFrame(() => {
      refs.forEach((el, id) => {
        const b = before.get(id)
        if (b === undefined) return
        const delta = b - el.getBoundingClientRect().top
        if (Math.abs(delta) < 1) return
        el.style.transition = "none"
        el.style.transform = `translateY(${delta}px)`
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.22s cubic-bezier(0.2, 0, 0, 1)"
          el.style.transform = ""
        })
      })
    })
  }

  function handleModuleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragModuleId || dragModuleId === targetId) return
    const targetEl = moduleItemRefs.current.get(targetId)
    if (targetEl) {
      const { top, height } = targetEl.getBoundingClientRect()
      const mid = top + height / 2
      const sorted = [...modules].sort((a, b) => a.order - b.order)
      const fromIdx = sorted.findIndex(m => m.id === dragModuleId)
      const toIdx   = sorted.findIndex(m => m.id === targetId)
      // Only swap when crossing the midpoint in the right direction
      if (fromIdx < toIdx && e.clientY < mid) return
      if (fromIdx > toIdx && e.clientY > mid) return
      if (fromIdx === toIdx) return
    }
    const sorted = [...modules].sort((a, b) => a.order - b.order)
    const fromIdx = sorted.findIndex(m => m.id === dragModuleId)
    const toIdx   = sorted.findIndex(m => m.id === targetId)
    if (fromIdx === toIdx) return
    moduleItemRefs.current.forEach(el => { el.style.transition = "none"; el.style.transform = "" })
    const before = snapTops(moduleItemRefs.current)
    const reordered = [...sorted]
    const [item] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, item)
    setModules(reordered.map((m, i) => ({ ...m, order: i })))
    flipAnimate(moduleItemRefs.current, before)
  }

  function handleModuleDragEnd() {
    setDragModuleId(null)
    setDraggingLabel("")
    const sorted = [...modules].sort((a, b) => a.order - b.order)
    callCurriculum("PATCH", { type: "reorder_modules", order: sorted.map(m => m.id) })
      .catch((e: any) => push("err", e.message))
  }

  function buildModuleItems(moduleId: string) {
    return [
      ...lessons.filter(l => l.moduleId === moduleId).map(l => ({ id: l.id, key: `lesson:${l.id}`, order: l.order ?? 0, itype: "lesson" as const })),
      ...moduleVideos.filter(v => v.moduleId === moduleId).map(v => ({ id: v.id, key: `module_video:${v.id}`, order: v.order ?? 0, itype: "module_video" as const })),
      ...moduleAttachments.filter(a => a.moduleId === moduleId).map(a => ({ id: a.id, key: `module_attachment:${a.id}`, order: a.order ?? 999, itype: "module_attachment" as const })),
    ].sort((a, b) => a.order - b.order)
  }

  function handleModuleContentDragOver(e: React.DragEvent, moduleId: string, targetKey: string) {
    e.preventDefault()
    if (!dragModuleContentKey || dragModuleContentKey === targetKey) return
    const allItems = buildModuleItems(moduleId)
    const fromIdx = allItems.findIndex(x => x.key === dragModuleContentKey)
    const toIdx   = allItems.findIndex(x => x.key === targetKey)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
    const targetEl = moduleContentRefs.current.get(targetKey)
    if (targetEl) {
      const { top, height } = targetEl.getBoundingClientRect()
      const mid = top + height / 2
      if (fromIdx < toIdx && e.clientY < mid) return
      if (fromIdx > toIdx && e.clientY > mid) return
    }
    moduleContentRefs.current.forEach(el => { el.style.transition = "none"; el.style.transform = "" })
    const before = snapTops(moduleContentRefs.current)
    const reordered = [...allItems]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const newOrders = reordered.map((x, i) => ({ key: x.key, order: i }))
    setLessons(p => p.map(l => { const u = newOrders.find(x => x.key === `lesson:${l.id}`); return u ? { ...l, order: u.order } : l }))
    setModuleVideos(p => p.map(v => { const u = newOrders.find(x => x.key === `module_video:${v.id}`); return u ? { ...v, order: u.order } : v }))
    setModuleAttachments(p => p.map(a => { const u = newOrders.find(x => x.key === `module_attachment:${a.id}`); return u ? { ...a, order: u.order } : a }))
    flipAnimate(moduleContentRefs.current, before)
  }

  function handleModuleContentDragEnd(moduleId: string) {
    setDragModuleContentKey(null)
    setDraggingLabel("")
    const allItems = buildModuleItems(moduleId)
    callCurriculum("PATCH", {
      type: "reorder_module_items",
      items: allItems.map(x => ({ type: x.itype, id: x.id })),
    }).catch((e: any) => push("err", e.message))
  }

  async function createLesson(moduleId: string) {
    const title = newLessonTitle.trim()
    if (!title) return
    const allCount = lessons.filter(l => l.moduleId === moduleId).length + moduleVideos.filter(v => v.moduleId === moduleId).length + moduleAttachments.filter(a => a.moduleId === moduleId).length
    try {
      const d = await callCurriculum("POST", { type: "lesson", moduleId, title, order: allCount })
      setLessons(p => [...p, d.lesson])
      setNewLessonTitle(""); setAddingLessonForModule(null)
      router.push(`/instructor-dashboard/groups/${groupId}/lessons/${d.lesson.id}`)
      push("ok", "Leçon créée")
    } catch (e: any) { push("err", e.message) }
  }

  async function saveLesson(lesson: Lesson) {
    setSaving(true)
    try {
      const d = await callCurriculum("PATCH", {
        type: "lesson", id: lesson.id,
        title: lesson.title, description: lesson.description, content: lesson.content,
      })
      setLessons(p => p.map(l => l.id === lesson.id ? d.lesson : l))
      setEditingLesson(d.lesson); setLessonDirty(false)
      push("ok", "Leçon enregistrée")
    } catch (e: any) { push("err", e.message) }
    finally { setSaving(false) }
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm("Supprimer cette leçon ?")) return
    try {
      await callCurriculum("DELETE", { type: "lesson", id: lessonId })
      setLessons(p => p.filter(l => l.id !== lessonId))
      setVideos(p => p.filter(v => v.lessonId !== lessonId))
      setLessonAttachments(p => p.filter(a => a.lessonId !== lessonId))
      if (selectedLessonId === lessonId) { setSelectedLessonId(null); setEditingLesson(null) }
      push("ok", "Leçon supprimée")
    } catch (e: any) { push("err", e.message) }
  }

  async function createVideo(lessonId: string) {
    if (!newVideo.title.trim() && !newVideo.driveUrl.trim()) return
    try {
      const d = await callCurriculum("POST", {
        type: "video", lessonId,
        title: newVideo.title || "Vidéo", driveUrl: newVideo.driveUrl, description: newVideo.description,
      })
      setVideos(p => [...p, d.video])
      setNewVideo({ title: "", driveUrl: "", description: "" })
      setAddingVideoForLesson(null)
      push("ok", "Vidéo ajoutée")
    } catch (e: any) { push("err", e.message) }
  }

  async function saveVideo(videoId: string) {
    const edits = videoEdits[videoId]; if (!edits) return
    try {
      const d = await callCurriculum("PATCH", { type: "video", id: videoId, ...edits })
      setVideos(p => p.map(v => v.id === videoId ? d.video : v))
      setEditingVideoId(null); push("ok", "Vidéo mise à jour")
    } catch (e: any) { push("err", e.message) }
  }

  async function deleteVideo(videoId: string) {
    if (!confirm("Supprimer cette vidéo ?")) return
    try {
      await callCurriculum("DELETE", { type: "video", id: videoId })
      setVideos(p => p.filter(v => v.id !== videoId))
      setVideoAttachments(p => p.filter(a => a.videoId !== videoId))
      push("ok", "Vidéo supprimée")
    } catch (e: any) { push("err", e.message) }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadingFor || !e.target.files?.length) return
    const file = e.target.files[0]; setUploading(true)
    try {
      const fd = new FormData()
      fd.append("type", uploadingFor.type); fd.append("parentId", uploadingFor.parentId)
      fd.append("name", file.name); fd.append("file", file)
      const res = await fetch(`/api/instructor/groups/${groupId}/attachments`, { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      if (uploadingFor.type === "lesson") setLessonAttachments(p => [...p, { ...d.attachment, lessonId: uploadingFor.parentId }])
      else setVideoAttachments(p => [...p, { ...d.attachment, videoId: uploadingFor.parentId }])
      push("ok", "Fichier uploadé")
    } catch (e: any) { push("err", e.message) }
    finally { setUploading(false); setUploadingFor(null); e.target.value = "" }
  }

  async function deleteAttachment(type: "lesson_attachment" | "video_attachment", id: string) {
    try {
      await fetch(`/api/instructor/groups/${groupId}/attachments`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      })
      if (type === "lesson_attachment") setLessonAttachments(p => p.filter(a => a.id !== id))
      else setVideoAttachments(p => p.filter(a => a.id !== id))
      push("ok", "Fichier supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  // ── Homework ─────────────────────────────────────────────────────────────────

  async function createHomework(moduleId: string) {
    const title = homeworkForm.title.trim()
    if (!title) return
    setSavingHomework(true)
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, title, text: homeworkForm.text.trim(), deadline: homeworkForm.deadline || null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setHomework(p => [...p, d.homework])
      setHomeworkForm({ title: "", text: "", deadline: "" })
      setAddingHomeworkFor(null)
      push("ok", "Devoir créé")
    } catch (e: any) { push("err", e.message) }
    finally { setSavingHomework(false) }
  }

  async function saveHomework(hw: HomeworkItem) {
    setSavingHomework(true)
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/homework`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: hw.id, title: homeworkForm.title, text: homeworkForm.text, deadline: homeworkForm.deadline || null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setHomework(p => p.map(h => h.id === hw.id ? { ...h, ...d.homework } : h))
      setEditingHomeworkId(null)
      push("ok", "Devoir mis à jour")
    } catch (e: any) { push("err", e.message) }
    finally { setSavingHomework(false) }
  }

  async function deleteHomework(id: string) {
    if (!confirm("Supprimer ce devoir et toutes les soumissions ?")) return
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/homework`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setHomework(p => p.filter(h => h.id !== id))
      push("ok", "Devoir supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  async function handleHwAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const homeworkId = uploadingHwAttFor
    if (!homeworkId || !e.target.files?.length) return
    const file = e.target.files[0]
    try {
      const fd = new FormData()
      fd.append("homeworkId", homeworkId)
      fd.append("name", file.name)
      fd.append("file", file)
      const res = await fetch(`/api/instructor/groups/${groupId}/homework/attachments`, { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setHomework(p => p.map(h => h.id === homeworkId
        ? { ...h, attachments: [...h.attachments, d.attachment] }
        : h
      ))
      push("ok", "Fichier ajouté")
    } catch (e: any) { push("err", e.message) }
    finally { setUploadingHwAttFor(null); e.target.value = "" }
  }

  async function deleteHwAttachment(attachmentId: string, homeworkId: string) {
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/homework/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attachmentId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setHomework(p => p.map(h => h.id === homeworkId
        ? { ...h, attachments: h.attachments.filter(a => a.id !== attachmentId) }
        : h
      ))
      push("ok", "Fichier supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const sortedModules = [...modules].sort((a, b) => a.order - b.order)
  const selectedLesson = lessons.find(l => l.id === selectedLessonId) || null

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingBI />
  if (!group) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fafafa" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 8px" }}>Groupe introuvable</p>
          <Link href="/instructor-dashboard/groups" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>← Retour aux formations</Link>
        </div>
      </div>
    )
  }

  const sm = STATUS_META[group.status]
  const isBootcamp = group.programType === "bootcamp"
  const nextSess = group.nextSession
  const nextSessions = (group.nextSessions && group.nextSessions.length > 0)
    ? group.nextSessions
    : (nextSess ? [nextSess] : [])
  const relevantSess = nextSess ?? todaySession
  const minsUntil = sessMinutesUntil(relevantSess)
  const showBanner = !!relevantSess && relevantSess.date === todayYMD() && minsUntil <= 60
  const canJoinNow = minsUntil <= 5
  const hasLiveNext = showBanner

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>

      {/* ─── TOP HEADER ──────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff",
        borderBottom: "1px solid #f1f5f9",
        padding: "14px 28px 0",
        display: "flex", flexDirection: "column",
      }}>
        {/* Row 1: breadcrumb + status */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/instructor-dashboard/overview" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>
              Accueil
            </Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href="/instructor-dashboard/groups" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>
              Formations
            </Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {group.title}
            </span>
          </div>

          {/* Status badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 99,
            fontSize: 12, fontWeight: 700,
            background: sm.bg, color: sm.text, border: `1.5px solid ${sm.border}`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot }} />
            {sm.label}
          </span>
        </div>

        {/* Row 2: Group title + tabs */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
          <div style={{ marginTop: -5 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
              {group.title}
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0" }}>
              {group.program?.title || (isBootcamp ? "Bootcamp" : "Formation")}
            </p>
          </div>

          {/* Tabs */}
          <nav style={{ display: "flex", gap: 2 }}>
            {([
              { id: "overview",  label: "Vue d'ensemble", icon: LayoutList },
              { id: "etudiants", label: "Étudiants",       icon: Users,     count: group.students.length },
              { id: "seances",   label: "Séances",         icon: Calendar,  count: group.pastSessions?.length || 0 },
            ] as { id: Tab; label: string; icon: React.ElementType; count?: number }[]).map(({ id, label, icon: Icon, count }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTabWithRoute(id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px 10px",
                    border: "none", background: "transparent", cursor: "pointer",
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? "color-mix(in oklch, var(--accent) 85%, black)" : "#6b7280",
                    borderBottom: isActive ? "2.5px solid var(--accent)" : "2.5px solid transparent",
                    marginBottom: -1,
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={13} />
                  {label}
                  {count !== undefined && count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 99,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: isActive ? "color-mix(in oklch, var(--accent) 12%, transparent)" : "#f3f4f6",
                      color: isActive ? "color-mix(in oklch, var(--accent) 85%, black)" : "#6b7280",
                      padding: "0 4px",
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* ─── VUE D'ENSEMBLE ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", background: "#fafafa" }}>
            <div style={{ padding: "24px 28px 64px", display: "grid", gap: 20, alignContent: "start" }}>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { icon: Users,      value: group.students.length,  label: "Étudiants", iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: LayoutList, value: modules.length,         label: "Modules",   iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: FileText,   value: lessons.length,         label: "Leçons",    iconColor: "#10b981", iconBg: "rgba(16,185,129,0.08)" },
              { icon: Video,      value: videos.length,          label: "Vidéos",    iconColor: "#f59e0b", iconBg: "rgba(245,158,11,0.08)" },
            ].map((card) => (
              <GroupKpiCard key={card.label} {...card} />
            ))}
          </div>

          {/* Next session live banner */}
          {hasLiveNext && (
            <div style={{ background: "linear-gradient(135deg,color-mix(in oklch, var(--accent) 85%, black) 0%,#7c3aed 100%)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 8px 24px color-mix(in oklch, var(--accent) 25%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Video size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", padding: "2px 10px", borderRadius: 99, marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>PROCHAINE SÉANCE</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 4px", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
                    {relevantSess!.title || "Séance de formation"}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={12} />
                    {fmtDate(relevantSess!.date)} à {relevantSess!.start_time || "—"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {relevantSess!.joinUrl ? (
                  <button
                    onClick={() => canJoinNow && window.open(relevantSess!.joinUrl!, "_blank")}
                    disabled={!canJoinNow}
                    title={canJoinNow ? undefined : "Disponible 5 min avant le début"}
                    style={{ background: "#fff", color: canJoinNow ? "color-mix(in oklch, var(--accent) 85%, black)" : "#94a3b8", border: "none", padding: "11px 20px", borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: canJoinNow ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8, opacity: canJoinNow ? 1 : 0.6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                  >
                    <ExternalLink size={14} /> Lancer le Live
                  </button>
                ) : (
                  <button
                    onClick={generateMeet}
                    disabled={generatingMeet}
                    style={{ background: "#fff", color: "color-mix(in oklch, var(--accent) 85%, black)", border: "none", padding: "11px 20px", borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: generatingMeet ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: generatingMeet ? 0.7 : 1, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                  >
                    {generatingMeet ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                    {generatingMeet ? "Génération…" : "Créer le Meet"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Non-live next session */}
          {nextSess && !hasLiveNext && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f4f6fb", border: "1px solid #e8ecf3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Calendar size={18} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Prochaine séance</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{nextSess.title || "Séance"}</p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={11} /> {fmtDate(nextSess.date)} à {nextSess.start_time || "—"}
                </p>
              </div>
            </div>
          )}

          {/* 2-col: program info + instructor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

            {/* Program description */}
            {group.program && (group.program.longDescription || group.program.shortDescription) ? (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {group.program.coverImage && (
                  <div style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden", position: "relative" }}>
                    <img src={group.program.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
                    <span style={{ position: "absolute", bottom: 12, left: 16, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.35)", padding: "3px 10px", borderRadius: 6, backdropFilter: "blur(4px)" }}>
                      {isBootcamp ? "Bootcamp" : "Formation"}
                    </span>
                  </div>
                )}
                <div style={{ padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 10px", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
                    {group.program.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.75 }}>
                    {group.program.longDescription || group.program.shortDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0", padding: "40px 24px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div>
                  {isBootcamp ? <Layers size={32} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} /> : <BookOpen size={32} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} />}
                  <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Aucune description de programme</p>
                </div>
              </div>
            )}

            {/* Right: instructor card + quick stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 104, alignSelf: "start" }}>
              {/* Instructor */}
              {group.instructor && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Formateur</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {group.instructor.avatar ? (
                      <img
                        src={group.instructor.avatar}
                        alt=""
                        style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0, border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)" }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", background: "color-mix(in oklch, var(--accent) 10%, transparent)", border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)" }}>
                        {initials(group.instructor.name, group.instructor.surname)}
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>
                        {[group.instructor.name, group.instructor.surname].filter(Boolean).join(" ")}
                      </p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <GraduationCap size={11} /> Formateur
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Next session (overview style) */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "color-mix(in oklch, var(--accent) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent,var(--accent))" }}>
                      <Calendar size={13} strokeWidth={2} />
                    </div>
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Séances à venir</h2>
                  </div>
                  <Link href="/instructor-dashboard/agenda" style={{ textDecoration: "none" }}>
                    <span style={{ fontSize: 11, color: "var(--accent,var(--accent))", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                      Voir agenda <ExternalLink size={11} />
                    </span>
                  </Link>
                </div>
                {nextSessions.length === 0 ? (
                  <div style={{ padding: "22px 18px", textAlign: "center" }}>
                    <Calendar size={24} color="#e2e8f0" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Aucune séance planifiée</p>
                  </div>
                ) : (
                  <div style={{ padding: "8px 0" }}>
                    {nextSessions.slice(0, 3).map((session, idx) => {
                      const sessionDate = new Date(session.date + "T00:00:00")
                      const now = new Date()
                      const isToday = sessionDate.toDateString() === now.toDateString()
                      return (
                        <div
                          key={session.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 11, padding: "9px 18px", transition: "background 0.12s",
                            borderBottom: idx < Math.min(nextSessions.length, 3) - 1 ? "1px solid #f8fafc" : "none",
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fafbfd"}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            background: isToday ? "color-mix(in oklch, var(--accent) 10%, transparent)" : "#f8fafc",
                            border: `1.5px solid ${isToday ? "color-mix(in oklch, var(--accent) 20%, transparent)" : "#f1f5f9"}`,
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: isToday ? "var(--accent)" : "#0f172a", lineHeight: 1 }}>
                              {sessionDate.getDate()}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", lineHeight: 1, marginTop: 1 }}>
                              {sessionDate.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {session.title || "Séance"}
                            </p>
                            <p style={{ fontSize: 11, color: "#475569", margin: "1px 0 0" }}>
                              {session.start_time ? session.start_time.slice(0, 5) : "—"} · {fmtDate(session.date)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Accès rapide</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {([
                    { label: "Étudiants",  tab: "etudiants" as Tab, icon: Users  },
                    { label: "Historique", tab: "seances" as Tab,   icon: Clock  },
                  ]).map(({ label, tab, icon: Icon }) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTabWithRoute(tab)}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 9, border: "1px solid #f3f4f6", background: "#fafafa", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 6%, white)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in oklch, var(--accent) 20%, transparent)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fafafa"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#f3f4f6" }}
                    >
                      <Icon size={13} color="var(--accent)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
                      <ChevronRight size={12} style={{ color: "#d1d5db", marginLeft: "auto" }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          {/* ── Drag ghost (follows cursor, no browser ghost) ── */}
          <div
            ref={ghostRef}
            style={{ display: (dragModuleId || dragModuleContentKey) ? "flex" : "none", position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 9999, background: "#fff", border: "1.5px solid var(--accent)", borderRadius: 10, padding: "8px 14px", boxShadow: "0 8px 28px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)", fontSize: 13, fontWeight: 600, color: "#111827", maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", alignItems: "center", gap: 8, transform: "translate(0,0)", willChange: "transform" }}
          >
            <GripVertical size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
            {draggingLabel}
          </div>

          {/* ── Modules & Leçons – Parcours ── */}
          <div style={{ position: "relative", paddingLeft: 16 }}>
            {/* Left accent line */}
            <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: "linear-gradient(to bottom, var(--accent), color-mix(in oklch, var(--accent) 60%, white))", borderRadius: 99 }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Programme</span>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
                <span style={{ color: "#d1d5db", fontSize: 13 }}>·</span>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{lessons.length} leçon{lessons.length !== 1 ? "s" : ""}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: resourceMode === "default" ? "#0f766e" : "var(--accent)", background: resourceMode === "default" ? "rgba(15,118,110,0.08)" : "color-mix(in oklch, var(--accent) 8%, transparent)", border: resourceMode === "default" ? "1px solid rgba(15,118,110,0.16)" : "1px solid color-mix(in oklch, var(--accent) 18%, transparent)", padding: "3px 8px", borderRadius: 999 }}>
                  {resourceMode === "default" ? "Ressources du cours" : "Ressources personnalisees"}
                </span>
              </div>
              {resourceMode === "default" ? (
                <button
                  onClick={useCustomResources}
                  disabled={switchingResources}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#0f766e", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: switchingResources ? "not-allowed" : "pointer", opacity: switchingResources ? 0.7 : 1, boxShadow: "0 2px 8px rgba(15,118,110,0.25)", flexShrink: 0 }}
                >
                  {switchingResources ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />} Utiliser mes ressources
                </button>
              ) : (
                <button
                  onClick={() => setAddingModule(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--accent)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 35%, transparent)", flexShrink: 0 }}
                >
                  <Plus size={13} /> Module
                </button>
              )}
            </div>

            {resourceMode === "default" && (
              <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(15,118,110,0.16)", background: "rgba(15,118,110,0.06)", color: "#0f766e", fontSize: 12, fontWeight: 600 }}>
                Ce groupe utilise les ressources par defaut de la formation. Passez en ressources personnalisees pour modifier les modules, lecons, videos ou fichiers seulement pour ce groupe.
              </div>
            )}

            {/* Inline new module */}
            {resourceMode === "custom" && addingModule && (
              <div style={{ marginBottom: 12, padding: "14px 16px", background: "#fff", borderRadius: 14, border: "1.5px dashed color-mix(in oklch, var(--accent) 40%, white)", display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  autoFocus
                  value={newModuleTitle}
                  onChange={e => setNewModuleTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createModule(); if (e.key === "Escape") { setAddingModule(false); setNewModuleTitle("") } }}
                  placeholder="Titre du module…"
                  style={{ flex: 1, padding: "7px 12px", border: "1.5px solid color-mix(in oklch, var(--accent) 40%, white)", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}
                />
                <button onClick={createModule} style={{ padding: "7px 14px", background: "var(--accent)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Créer</button>
                <button onClick={() => { setAddingModule(false); setNewModuleTitle("") }} style={{ padding: "7px 10px", background: "#f4f6fb", border: "1px solid #e8ecf3", borderRadius: 8, fontSize: 12, color: "#6b7280", cursor: "pointer" }}><X size={13} /></button>
              </div>
            )}

            {/* Empty state */}
            {modules.length === 0 && !addingModule && (
              <div style={{ padding: "40px 24px", textAlign: "center", background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0" }}>
                <BookOpen size={28} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Aucun module — cliquez sur "+ Module" pour commencer</p>
              </div>
            )}

            {/* Module cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedModules.map((mod, modIdx) => {
                const modLessons = lessons.filter(l => l.moduleId === mod.id).sort((a, b) => a.order - b.order)
                const isExpanded = expandedModules.has(mod.id)
                const isEditingMod = editingModuleId === mod.id
                const etapeNum = String(modIdx + 1).padStart(2, "0")
                return (
                  <div
                    key={mod.id}
                    ref={el => {
                      if (el) moduleItemRefs.current.set(mod.id, el)
                      else moduleItemRefs.current.delete(mod.id)
                    }}
                    onDragOver={e => handleModuleDragOver(e, mod.id)}
                    onDrop={e => e.preventDefault()}
                    style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden", opacity: dragModuleId === mod.id ? 0.28 : 1 }}
                  >
                    {/* Module header */}
                    <div
                      style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 20px 18px", cursor: "pointer" }}
                      onClick={() => setExpandedModules(prev => { const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s })}
                    >
                      {/* Square number badge */}
                      <div style={{ width: 54, height: 54, borderRadius: 13, border: "2px solid color-mix(in oklch, var(--accent) 100%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)", letterSpacing: "-0.03em" }}>
                        {etapeNum}
                      </div>

                      {/* Module info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#b0b7c8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
                          ÉTAPE {etapeNum}
                        </div>
                        {isEditingMod ? (
                          <input
                            autoFocus
                            value={editingModuleTitle}
                            onChange={e => setEditingModuleTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveModuleTitle(mod.id); if (e.key === "Escape") setEditingModuleId(null) }}
                            onClick={e => e.stopPropagation()}
                            style={{ width: "100%", padding: "4px 10px", border: "1.5px solid color-mix(in oklch, var(--accent) 40%, white)", borderRadius: 6, fontSize: 18, color: "#111827", outline: "none", fontFamily: "inherit", fontWeight: 800 }}
                          />
                        ) : (
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.25 }}>{mod.title}</div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                          <BookOpen size={12} color="#9ca3af" />
                          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{modLessons.length} leçon{modLessons.length !== 1 ? "s" : ""}</span>
                          {mod.description && (
                            <>
                              <span style={{ color: "#e2e8f0", fontSize: 12 }}>·</span>
                              <span style={{ fontSize: 12, color: "#b0b7c8" }}>{mod.description}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions + chevron */}
                      <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                        {isEditingMod ? (
                          <>
                            <button onClick={() => saveModuleTitle(mod.id)} style={{ padding: "3px 8px", background: "var(--accent)", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>OK</button>
                            <button onClick={() => setEditingModuleId(null)} style={{ padding: "3px 7px", background: "#f4f6fb", border: "1px solid #e8ecf3", borderRadius: 6, fontSize: 11, color: "#6b7280", cursor: "pointer" }}><X size={11} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingModuleId(mod.id); setEditingModuleTitle(mod.title) }} style={{ padding: "5px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#d1d5db", transition: "all 0.12s" }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "color-mix(in oklch, var(--accent) 85%, black)"; (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 7%, transparent)" }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}><Pencil size={13} /></button>
                            <button onClick={() => deleteModule(mod.id)} style={{ padding: "5px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#d1d5db", transition: "all 0.12s" }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}><Trash2 size={13} /></button>
                            <div
                              draggable
                              onDragStart={e => {
                                const img = new Image(1, 1)
                                img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                                e.dataTransfer.setDragImage(img, 0, 0)
                                e.stopPropagation()
                                setDragModuleId(mod.id)
                                setDraggingLabel(mod.title)
                                if (ghostRef.current) ghostRef.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY - 18}px)`
                              }}
                              onDrag={e => { if (e.clientX > 0 && ghostRef.current) ghostRef.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY - 18}px)` }}
                              onDragEnd={handleModuleDragEnd}
                              style={{ padding: "5px 6px", color: "#d1d5db", cursor: "grab", borderRadius: 6, transition: "color 0.12s, background 0.12s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = "#9ca3af"; (e.currentTarget as HTMLDivElement).style.background = "#f4f6fb" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = "#d1d5db"; (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                              title="Glisser pour réordonner"
                            >
                              <GripVertical size={15} />
                            </div>
                            <div style={{ padding: "5px 6px", color: "#9ca3af", cursor: "pointer" }} onClick={() => setExpandedModules(prev => { const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s })}>
                              <ChevronDown size={17} style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <motion.div
                      initial={false}
                      animate={isExpanded ? "open" : "collapsed"}
                      variants={moduleExpandVariants}
                      style={{ overflow: "hidden", borderTop: "1px solid #f0f1f5" }}
                      aria-hidden={!isExpanded}
                    >
                    {(() => {
                      const allModuleItems = buildModuleItems(mod.id)
                      return (
                        <div style={{ borderTop: "1px solid #f0f1f5" }}>
                          {/* Unified items list */}
                          {allModuleItems.map((item, itemIdx) => {
                            const itemKey = item.key
                            const isDragging = dragModuleContentKey === itemKey
                            const baseRow: React.CSSProperties = {
                              display: "flex", alignItems: "center", gap: 14, padding: "11px 20px",
                              borderBottom: itemIdx < allModuleItems.length - 1 ? "1px solid #f8f9fb" : "none",
                              transition: "background 0.12s", opacity: isDragging ? 0.28 : 1,
                            }
                            const grip = (label: string) => (
                              <div draggable
                                onDragStart={e => {
                                  const img = new Image(1, 1); img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                                  e.dataTransfer.setDragImage(img, 0, 0); e.stopPropagation()
                                  setDragModuleContentKey(itemKey); setDraggingLabel(label)
                                  if (ghostRef.current) ghostRef.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY - 18}px)`
                                }}
                                onDrag={e => { if (e.clientX > 0 && ghostRef.current) ghostRef.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY - 18}px)` }}
                                onDragEnd={() => handleModuleContentDragEnd(mod.id)}
                                style={{ padding: "4px 5px", color: "#e5e7eb", cursor: "grab", borderRadius: 6, transition: "color 0.12s, background 0.12s", flexShrink: 0 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = "#9ca3af"; (e.currentTarget as HTMLDivElement).style.background = "#f4f6fb" }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                                title="Glisser pour réordonner"
                              ><GripVertical size={13} /></div>
                            )

                            if (item.itype === "lesson") {
                              const lesson = lessons.find(l => l.id === item.id)!
                              return (
                                <div key={itemKey}
                                  ref={el => { if (el) moduleContentRefs.current.set(itemKey, el); else moduleContentRefs.current.delete(itemKey) }}
                                  onDragOver={e => handleModuleContentDragOver(e, mod.id, itemKey)}
                                  onDrop={e => e.preventDefault()}
                                  style={{ ...baseRow, cursor: "pointer" }}
                                  onClick={() => selectLesson(lesson)}
                                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.05)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                                >
                                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }}>
                                    <BookOpen size={16} strokeWidth={2.5} color="#fff" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Leçon</div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lesson.title}</span>
                                  </div>
                                  <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                                    <button onClick={() => deleteLesson(lesson.id)}
                                      style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                    ><Trash2 size={13} /></button>
                                    {grip(lesson.title)}
                                  </div>
                                </div>
                              )
                            }

                            if (item.itype === "module_video") {
                              const vid = moduleVideos.find(v => v.id === item.id)!
                              const vidViewerUrl = vid.driveUrl
                                ? `/instructor-dashboard/groups/${groupId}/video-viewer?url=${encodeURIComponent(vid.driveUrl)}&title=${encodeURIComponent(vid.title)}&groupTitle=${encodeURIComponent(group?.title || groupId)}`
                                : null;
                              return (
                                <div key={itemKey}
                                  ref={el => { if (el) moduleContentRefs.current.set(itemKey, el); else moduleContentRefs.current.delete(itemKey) }}
                                  onDragOver={e => handleModuleContentDragOver(e, mod.id, itemKey)}
                                  onDrop={e => e.preventDefault()}
                                  onClick={() => { if (vidViewerUrl) router.push(vidViewerUrl) }}
                                  style={{ ...baseRow, cursor: vidViewerUrl ? "pointer" : "default" }}
                                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(245,158,11,0.05)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                                >
                                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(245,158,11,0.35)" }}>
                                    <Video size={16} strokeWidth={2.5} color="#fff" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Vidéo</div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vid.title}</span>
                                  </div>
                                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                    {vid.driveUrl && (
                                      <a href={vid.driveUrl} target="_blank" rel="noopener noreferrer"
                                        style={{ padding: "3px 5px", color: "#9ca3af", borderRadius: 5, display: "flex", alignItems: "center", textDecoration: "none", transition: "color 0.12s" }}
                                        onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                                        onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                                      ><ExternalLink size={12} /></a>
                                    )}
                                    <button onClick={async () => {
                                      try { await callCurriculum("DELETE", { type: "module_video", id: vid.id }); setModuleVideos(p => p.filter(x => x.id !== vid.id)) }
                                      catch (e: any) { push("err", e.message) }
                                    }} style={{ padding: "3px 5px", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                    ><Trash2 size={12} /></button>
                                    {grip(vid.title)}
                                  </div>
                                </div>
                              )
                            }

                            // module_attachment
                            const att    = moduleAttachments.find(a => a.id === item.id)!
                            const pdfUrl = att.url && isPdf(att.name)
                              ? `/instructor-dashboard/groups/${groupId}/pdf-viewer?url=${encodeURIComponent(att.url)}&name=${encodeURIComponent(att.name)}&groupTitle=${encodeURIComponent(group?.title || groupId)}`
                              : null
                            const isAttPdf = !!pdfUrl
                            return (
                              <div key={itemKey}
                                ref={el => { if (el) moduleContentRefs.current.set(itemKey, el); else moduleContentRefs.current.delete(itemKey) }}
                                onDragOver={e => handleModuleContentDragOver(e, mod.id, itemKey)}
                                onDrop={e => e.preventDefault()}
                                onClick={() => { if (pdfUrl) router.push(pdfUrl) }}
                                style={{ ...baseRow, cursor: pdfUrl ? "pointer" : "default" }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isAttPdf ? "rgba(225,29,72,0.05)" : "rgba(20,184,166,0.05)"}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                              >
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: isAttPdf ? "#e11d48" : "#14b8a6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: isAttPdf ? "0 2px 8px rgba(225,29,72,0.35)" : "0 2px 8px rgba(20,184,166,0.35)" }}>
                                  {isAttPdf ? <FileText size={16} strokeWidth={2.5} color="#fff" /> : <Paperclip size={16} strokeWidth={2.5} color="#fff" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: isAttPdf ? "#e11d48" : "#0d9488", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>{isAttPdf ? "PDF" : "Fichier"}</div>
                                  <span style={{ fontSize: 14, fontWeight: 500, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                                </div>
                                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                  {att.url && !pdfUrl && (
                                    <a href={att.url} target="_blank" rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      style={{ padding: "3px 5px", color: "#9ca3af", borderRadius: 5, display: "flex", alignItems: "center", textDecoration: "none", transition: "color 0.12s" }}
                                      onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                                      onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                                    ><ExternalLink size={12} /></a>
                                  )}
                                  <button onClick={async () => {
                                    try { await callCurriculum("DELETE", { type: "module_attachment", id: att.id }); setModuleAttachments(p => p.filter(x => x.id !== att.id)) }
                                    catch (e: any) { push("err", e.message) }
                                  }} style={{ padding: "3px 5px", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                  ><Trash2 size={12} /></button>
                                  {grip(att.name)}
                                </div>
                              </div>
                            )
                          })}

                          {/* Add lesson form */}
                          {addingLessonForModule === mod.id && (
                            <div style={{ display: "flex", gap: 8, padding: "10px 20px", alignItems: "center", borderTop: "1px solid #f0f1f5" }}>
                              <input autoFocus value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") createLesson(mod.id); if (e.key === "Escape") { setAddingLessonForModule(null); setNewLessonTitle("") } }}
                                placeholder="Titre de la leçon…"
                                style={{ flex: 1, padding: "7px 12px", border: "1.5px solid color-mix(in oklch, var(--accent) 40%, white)", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}
                              />
                              <button onClick={() => createLesson(mod.id)} style={{ padding: "7px 14px", background: "var(--accent)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Ajouter</button>
                              <button onClick={() => { setAddingLessonForModule(null); setNewLessonTitle("") }} style={{ padding: "7px 9px", background: "#f4f6fb", border: "1px solid #e8ecf3", borderRadius: 8, fontSize: 12, color: "#6b7280", cursor: "pointer" }}><X size={12} /></button>
                            </div>
                          )}

                          {/* Add video form */}
                          {addingModuleVideoFor === mod.id && (
                            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f0f1f5" }}>
                              <input autoFocus value={newModuleVideo.title} onChange={e => setNewModuleVideo(p => ({ ...p, title: e.target.value }))}
                                placeholder="Titre de la vidéo…"
                                style={{ padding: "7px 12px", border: "1.5px solid color-mix(in oklch, var(--accent) 40%, white)", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}
                              />
                              <input value={newModuleVideo.driveUrl} onChange={e => setNewModuleVideo(p => ({ ...p, driveUrl: e.target.value }))}
                                placeholder="Lien Google Drive…"
                                style={{ padding: "7px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}
                                onFocus={e => (e.currentTarget.style.borderColor = "color-mix(in oklch, var(--accent) 40%, white)")}
                                onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={async () => {
                                  if (!newModuleVideo.title.trim()) return
                                  const allCount = allModuleItems.length
                                  try {
                                    const d = await callCurriculum("POST", { type: "module_video", moduleId: mod.id, ...newModuleVideo, order: allCount })
                                    setModuleVideos(p => [...p, d.moduleVideo])
                                    setNewModuleVideo({ title: "", driveUrl: "", description: "" })
                                    setAddingModuleVideoFor(null)
                                    push("ok", "Vidéo ajoutée")
                                  } catch (e: any) { push("err", e.message) }
                                }} style={{ padding: "6px 14px", background: "var(--accent)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Ajouter</button>
                                <button onClick={() => { setAddingModuleVideoFor(null); setNewModuleVideo({ title: "", driveUrl: "", description: "" }) }}
                                  style={{ padding: "6px 10px", background: "#f4f6fb", border: "1px solid #e8ecf3", borderRadius: 8, fontSize: 12, color: "#6b7280", cursor: "pointer" }}><X size={12} /></button>
                              </div>
                            </div>
                          )}

                          {/* Homework items for this module */}
                          {homework.filter(h => h.moduleId === mod.id).map(hw => {
                            const deadlinePassed = hw.deadline ? new Date(hw.deadline) < new Date() : false
                            return (
                              <div key={hw.id} style={{ borderTop: "1px solid #f0f1f5" }}>
                                <div
                                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", cursor: "pointer", transition: "background 0.12s" }}
                                  onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/homework/${hw.id}`)}
                                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fff8f0"}
                                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                                >
                                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <ClipboardList size={16} strokeWidth={2.5} color="#fff" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hw.title}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                                      {hw.deadline && (
                                        <span style={{ fontSize: 11, color: deadlinePassed ? "#ef4444" : "#f59e0b", display: "flex", alignItems: "center", gap: 3 }}>
                                          <Clock size={10} /> {new Date(hw.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                          {deadlinePassed && " — Expiré"}
                                        </span>
                                      )}
                                      <span style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}>
                                        <ClipboardCheck size={10} /> {hw.submissionsCount} soumission{hw.submissionsCount !== 1 ? "s" : ""}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                                    <button onClick={() => deleteHomework(hw.id)}
                                      style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                    ><Trash2 size={13} /></button>
                                    <ChevronRight size={14} style={{ color: "#d1d5db" }} />
                                  </div>
                                </div>
                              </div>
                            )
                          })}

                          {/* New homework form */}
                          {addingHomeworkFor === mod.id && (
                            <div style={{ borderTop: "1px solid #f0f1f5", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8, background: "#fffbf5" }}>
                              <input autoFocus value={homeworkForm.title} onChange={e => setHomeworkForm(p => ({ ...p, title: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Escape") { setAddingHomeworkFor(null); setHomeworkForm({ title: "", text: "", deadline: "" }) } }}
                                placeholder="Titre du devoir…"
                                style={{ padding: "8px 12px", border: "1.5px solid #fbbf24", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}
                              />
                              <textarea value={homeworkForm.text} onChange={e => setHomeworkForm(p => ({ ...p, text: e.target.value }))}
                                placeholder="Description / consignes…" rows={3}
                                style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit", resize: "vertical" }}
                                onFocus={e => (e.currentTarget.style.borderColor = "#fbbf24")}
                                onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Deadline :</label>
                                <input type="datetime-local" value={homeworkForm.deadline} onChange={e => setHomeworkForm(p => ({ ...p, deadline: e.target.value }))}
                                  style={{ padding: "6px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#374151", outline: "none", fontFamily: "inherit" }}
                                  onFocus={e => (e.currentTarget.style.borderColor = "#fbbf24")}
                                  onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                                />
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => createHomework(mod.id)} disabled={savingHomework}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#f59e0b", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}
                                >{savingHomework ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Créer le devoir</button>
                                <button onClick={() => { setAddingHomeworkFor(null); setHomeworkForm({ title: "", text: "", deadline: "" }) }}
                                  style={{ padding: "7px 9px", background: "#f4f6fb", border: "1px solid #e8ecf3", borderRadius: 8, fontSize: 12, color: "#6b7280", cursor: "pointer" }}
                                ><X size={12} /></button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 8, padding: "10px 20px", borderTop: "1px solid #f0f1f5" }}>
                            <button
                              onClick={() => { setAddingLessonForModule(mod.id); setAddingModuleVideoFor(null); setExpandedModules(prev => new Set([...prev, mod.id])) }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "transparent", border: "1.5px dashed #d1d5db", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#9ca3af", transition: "all 0.15s" }}
                              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "var(--accent)"; el.style.color = "var(--accent)"; el.style.background = "color-mix(in oklch, var(--accent) 4%, transparent)" }}
                              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "#d1d5db"; el.style.color = "#9ca3af"; el.style.background = "transparent" }}
                            ><Plus size={13} /> Leçon</button>
                            <button
                              onClick={() => { setAddingModuleVideoFor(mod.id); setAddingLessonForModule(null) }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#f5f3ff", border: "1.5px solid #ede9fe", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#7c3aed", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#ede9fe" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f3ff" }}
                            ><Video size={12} /> Vidéo</button>
                            <button
                              onClick={() => { setUploadingModuleFor(mod.id); moduleFileInputRef.current?.click() }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
                            ><Paperclip size={12} /> Fichier</button>
                            <button
                              onClick={() => { setAddingHomeworkFor(mod.id); setAddingLessonForModule(null); setAddingModuleVideoFor(null); setExpandedModules(prev => new Set([...prev, mod.id])) }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#92400e", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef3c7" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fffbeb" }}
                            ><ClipboardList size={12} /> Devoir</button>
                          </div>
                        </div>
                      )
                    })()}
                    </motion.div>
                  </div>
                )
              })}
            </div>

            {/* Homework with no matching module (safety net) */}
            {(() => {
              const moduleIds = new Set(sortedModules.map(m => m.id))
              const orphans = homework.filter(h => !moduleIds.has(h.moduleId))
              if (orphans.length === 0) return null
              return (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #fde68a", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden", marginTop: 4 }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #fef3c7", display: "flex", alignItems: "center", gap: 8, background: "#fffbeb" }}>
                    <ClipboardList size={14} color="#f59e0b" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Devoirs du groupe</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "#fef3c7", borderRadius: 99, padding: "2px 8px" }}>{orphans.length}</span>
                  </div>
                  {orphans.map(hw => {
                    const deadlinePassed = hw.deadline ? new Date(hw.deadline) < new Date() : false
                    return (
                      <div key={hw.id} style={{ borderTop: "1px solid #fef3c7" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", cursor: "pointer", transition: "background 0.12s" }}
                          onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/homework/${hw.id}`)}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fffbeb"}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <ClipboardList size={16} strokeWidth={2.5} color="#fff" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hw.title}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                              {hw.deadline && (
                                <span style={{ fontSize: 11, color: deadlinePassed ? "#ef4444" : "#f59e0b", display: "flex", alignItems: "center", gap: 3 }}>
                                  <Clock size={10} /> {new Date(hw.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                  {deadlinePassed && " — Expiré"}
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}>
                                <ClipboardCheck size={10} /> {hw.submissionsCount} soumission{hw.submissionsCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => deleteHomework(hw.id)}
                              style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                            ><Trash2 size={13} /></button>
                            <ChevronRight size={14} style={{ color: "#d1d5db" }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            </div>
        </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ÉTUDIANTS ──────────────────────────────────────────────────── */}
      {activeTab === "etudiants" && (
        <div style={{ padding: "24px 28px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Étudiants inscrits</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: "color-mix(in oklch, var(--accent) 85%, black)", background: "color-mix(in oklch, var(--accent) 8%, transparent)", padding: "2px 10px", borderRadius: 99, border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)" }}>
              {group.students.length}
            </span>
          </div>
          {group.students.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "56px 24px", textAlign: "center" }}>
              <Users size={36} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Aucun étudiant inscrit dans ce groupe</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {group.students.map(s => (
                <div
                  key={s.id}
                  style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", display: "flex", alignItems: "center", gap: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)" }}
                >
                  {s.avatar ? (
                    <img src={s.avatar} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(s.id), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {initials(s.name, s.surname)}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[s.name, s.surname].filter(Boolean).join(" ") || s.username || "—"}
                    </p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: SÉANCES ────────────────────────────────────────────────────── */}
      {activeTab === "seances" && (
        <div style={{ padding: "24px 28px 64px" }}>

          {/* Next session */}
          {nextSess && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Prochaine séance</h2>
              <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid color-mix(in oklch, var(--accent) 20%, white)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 16px color-mix(in oklch, var(--accent) 7%, transparent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in oklch, var(--accent) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Calendar size={20} color="var(--accent)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{nextSess.title || "Séance de formation"}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={12} /> {fmtDate(nextSess.date)} à {nextSess.start_time || "—"}
                    </p>
                  </div>
                </div>
                {hasLiveNext && (
                  nextSess.joinUrl ? (
                    <button onClick={() => window.open(nextSess.joinUrl!, "_blank")} style={primaryBtnStyle}>
                      <ExternalLink size={13} /> Lancer
                    </button>
                  ) : (
                    <button onClick={generateMeet} disabled={generatingMeet} style={{ ...primaryBtnStyle, opacity: generatingMeet ? 0.7 : 1 }}>
                      {generatingMeet ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
                      {generatingMeet ? "Génération…" : "Créer le Meet"}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Past sessions */}
          {group.pastSessions && group.pastSessions.length > 0 && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Historique ({group.pastSessions.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.pastSessions.map(s => (
                  <div key={s.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8ecf3", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f4f6fb", border: "1px solid #e8ecf3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Video size={15} color="#6b7280" />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 3px" }}>{s.title || "Séance"}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={10} /> {fmtDate(s.date)} à {s.start_time || "—"}
                        </p>
                      </div>
                    </div>
                    {s.recordingUrl ? (
                      <button onClick={() => window.open(s.recordingUrl!, "_blank")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "color-mix(in oklch, var(--accent) 7%, transparent)", color: "color-mix(in oklch, var(--accent) 85%, black)", border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 12%, transparent)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 7%, transparent)")}
                      >
                        <Play size={12} /> Voir l'enregistrement
                      </button>
                    ) : (
                      <button onClick={() => syncRecording(s.id)} disabled={syncingRecordings[s.id]}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#f4f6fb", color: "#6b7280", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: syncingRecordings[s.id] ? "not-allowed" : "pointer", opacity: syncingRecordings[s.id] ? 0.65 : 1, transition: "all 0.15s" }}
                        onMouseEnter={e => { if (!syncingRecordings[s.id]) { (e.currentTarget as HTMLButtonElement).style.background = "#eef0f5"; (e.currentTarget as HTMLButtonElement).style.color = "#374151" }}}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f4f6fb"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280" }}
                      >
                        {syncingRecordings[s.id] ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        {syncingRecordings[s.id] ? "Sync…" : "Synchroniser"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!nextSess && (!group.pastSessions || group.pastSessions.length === 0)) && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "56px 24px", textAlign: "center" }}>
              <Calendar size={36} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Aucune séance planifiée pour ce groupe</p>
            </div>
          )}
        </div>
      )}

        </motion.div>
      </AnimatePresence>

      {/* ─── Hidden file inputs ── */}
      <input ref={fileInputRef}      type="file" style={{ display: "none" }} onChange={handleFileUpload} />
      <input ref={videoFileInputRef} type="file" style={{ display: "none" }} onChange={handleFileUpload} />
      <input ref={hwFileInputRef}    type="file" style={{ display: "none" }} onChange={handleHwAttachmentUpload} />
      <input ref={moduleFileInputRef} type="file" style={{ display: "none" }} onChange={async e => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file || !uploadingModuleFor) return
        const moduleId = uploadingModuleFor
        setUploadingModuleFor(null)
        const allCount = lessons.filter(l => l.moduleId === moduleId).length + moduleVideos.filter(v => v.moduleId === moduleId).length + moduleAttachments.filter(a => a.moduleId === moduleId).length
        const fd = new FormData()
        fd.append("file", file); fd.append("name", file.name)
        fd.append("type", "module"); fd.append("parentId", moduleId)
        fd.append("order", String(allCount))
        try {
          const res = await fetch(`/api/instructor/groups/${groupId}/attachments`, { method: "POST", body: fd })
          const d = await res.json()
          if (!res.ok) throw new Error(d.error || "Erreur upload")
          setModuleAttachments(p => [...p, { id: d.attachment.id, moduleId: d.attachment.moduleId, name: d.attachment.name, url: d.attachment.url, order: allCount }])
          push("ok", "Fichier ajouté")
        } catch (err: any) { push("err", err.message) }
      }} />

      {/* ─── Toasts ── */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
            borderRadius: 12, fontSize: 13, fontWeight: 600, pointerEvents: "auto",
            background: "#fff",
            color: t.type === "ok" ? "#15803d" : "#dc2626",
            border: t.type === "ok" ? "1px solid #86efac" : "1px solid #fca5a5",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}>
            {t.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
            {t.text}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}


function StyledInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
      onFocus={e => (e.target.style.borderColor = "var(--accent)")}
      onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
    />
  )
}

function AttachmentRow({ att, onDelete }: { att: Attachment; onDelete: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 16px", background: hover ? "#f8f9ff" : "transparent", transition: "background 0.12s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    >
      <span style={{ fontSize: 15, flexShrink: 0 }}>{getFileIcon(att.name)}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
      {att.url && (
        <a href={att.url} target="_blank" rel="noopener noreferrer" download
          style={{ padding: "3px 8px", borderRadius: 6, background: "color-mix(in oklch, var(--accent) 7%, transparent)", color: "color-mix(in oklch, var(--accent) 85%, black)", fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
          ↓
        </a>
      )}
      <button onClick={onDelete}
        style={{ padding: "4px 6px", background: "transparent", border: "none", cursor: "pointer", color: "#d1d5db", borderRadius: 6, transition: "all 0.12s", flexShrink: 0 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}>
        <X size={12} />
      </button>
    </div>
  )
}

// ── Style constants ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280",
  marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase",
}

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", background: "var(--accent)",
  border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff",
  cursor: "pointer", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 28%, transparent)",
}

const ghostBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", background: "#fff",
  border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#6b7280",
  cursor: "pointer",
}

const iconBtnStyle: React.CSSProperties = {
  padding: "5px 7px", background: "#f4f6fb", border: "1px solid #e8ecf3",
  borderRadius: 7, cursor: "pointer", color: "#6b7280", display: "inline-flex", alignItems: "center",
}
