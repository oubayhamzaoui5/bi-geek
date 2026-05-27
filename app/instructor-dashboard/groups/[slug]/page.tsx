"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronRight, ChevronDown, Plus, Trash2,
  BookOpen, Layers, Users, GraduationCap, Video,
  Paperclip, FileText, X, Check, Loader2,
  ExternalLink, Pencil, AlertCircle,
  LayoutList, GripVertical,
  BrainCircuit, ClipboardCheck,
  Calendar, Clock, Link2,
} from "lucide-react"
import GroupKpiCard from "@/components/groups/GroupKpiCard"
import LoadingBI from "@/components/LoadingBI"

// ── Types ──────────────────────────────────────────────────────────────────────

type GroupStatus = "not_started" | "in_progress" | "completed"
type Tab = "overview" | "apprenants"
const TAB_ORDER: Tab[] = ["overview", "apprenants"]

function parseTab(value: string | null): Tab | null {
  if (!value) return null
  if (value === "etudiants") return "apprenants"
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
  instructors?: { id: string; name: string; surname: string; avatar?: string | null }[]
  program: Program | null
}

type Module     = { id: string; title: string; order: number; description: string; instructorId?: string; canEdit?: boolean }
type ModuleVideo = { id: string; moduleId: string; title: string; driveUrl: string; description: string; order: number; instructorId?: string; canEdit?: boolean }
type ModuleAttachment = { id: string; moduleId: string; name: string; url: string | null; order?: number; instructorId?: string; canEdit?: boolean }

type QuizItem = {
  id: string
  moduleId: string
  title: string
  deadline: string | null
  questionsCount: number
}

type ExerciseItem = {
  id: string
  moduleId: string
  title: string
  description: string
  deadline: string | null
  attachmentsCount: number
}

type SessionInfo = {
  id: string
  date: string
  start_time: string
  duration: number
  title: string | null
  joinUrl: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<GroupStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  not_started: { label: "Pas commencé", dot: "#94a3b8", text: "#475569", bg: "#f1f5f9",  border: "#e2e8f0" },
  in_progress:  { label: "En cours",    dot: "var(--accent)", text: "color-mix(in oklch, var(--accent) 85%, black)", bg: "color-mix(in oklch, var(--accent) 12%, white)",  border: "color-mix(in oklch, var(--accent) 45%, white)" },
  completed:    { label: "Terminé",     dot: "#22c55e", text: "#15803d", bg: "#dcfce7",  border: "#86efac" },
}

const AVATAR_COLORS = ["var(--accent)","#8b5cf6","#7c3aed","#10b981","#f59e0b","#ef4444","#ec4899","#a78bfa"]

function initials(name: string, surname: string) {
  return ((name?.[0] || "") + (surname?.[0] || "")).toUpperCase() || "?"
}

function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function fmtDeadline(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function fmtSessionDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

function sessionStartDate(date: string, time: string): Date {
  return new Date(`${date}T${time || "00:00"}:00`)
}

function sessionDiffMins(date: string, time: string): number {
  return (sessionStartDate(date, time).getTime() - Date.now()) / 60000
}

function getInstructorId(): string {
  try {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}
    const id = u?.id ?? u?.record?.id ?? u?.user?.id ?? ""
    return typeof id === "string" ? id.trim() : ""
  } catch { return "" }
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
  const [moduleVideos,       setModuleVideos]       = useState<ModuleVideo[]>([])
  const [moduleAttachments,  setModuleAttachments]  = useState<ModuleAttachment[]>([])

  // UI
  const [loading,              setLoading]              = useState(true)
  const [expandedModules,      setExpandedModules]      = useState<Set<string>>(new Set())
  const [activeTab,            setActiveTab]            = useState<Tab>("overview")

  // Inline creation
  const [addingModule,           setAddingModule]           = useState(false)
  const [newModuleTitle,         setNewModuleTitle]         = useState("")

  // Module inline title edit
  const [editingModuleId,    setEditingModuleId]    = useState<string | null>(null)
  const [editingModuleTitle, setEditingModuleTitle] = useState("")

  // Drag-and-drop reorder
  const [dragModuleId, setDragModuleId] = useState<string | null>(null)
  const [dragModuleContentKey, setDragModuleContentKey] = useState<string | null>(null)
  const [draggingLabel, setDraggingLabel] = useState<string>("")
  const [formateurIndex, setFormateurIndex] = useState(0)
  const moduleItemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const moduleContentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const ghostRef       = useRef<HTMLDivElement>(null)

  // Module-level resources
  const [addingModuleVideoFor,  setAddingModuleVideoFor]  = useState<string | null>(null)
  const [newModuleVideo,        setNewModuleVideo]        = useState({ title: "", driveUrl: "", description: "" })
  const moduleFileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingModuleFor, setUploadingModuleFor] = useState<string | null>(null)

  // Quiz & Exercise
  const [quizzes,    setQuizzes]    = useState<QuizItem[]>([])
  const [exercises,  setExercises]  = useState<ExerciseItem[]>([])

  // Next session
  const [nextSession,   setNextSession]   = useState<SessionInfo | null>(null)
  const [creatingMeet,  setCreatingMeet]  = useState(false)

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
        const [gRes, cRes, qRes, exRes, nsRes] = await Promise.all([
          fetch(`/api/instructor/groups/${groupId}`),
          fetch(`/api/instructor/groups/${groupId}/curriculum`),
          fetch(`/api/instructor/groups/${groupId}/quiz`),
          fetch(`/api/instructor/groups/${groupId}/exercice`),
          fetch(`/api/instructor/groups/${groupId}/next-session`),
        ])
        if (gRes.ok) {
          const d = await gRes.json()
          if (d.ok) {
            setGroup(d.group)
          }
        }
        if (cRes.ok) {
          const d = await cRes.json()
          if (d.ok) {
            setModules(d.modules || [])
            setModuleVideos(d.moduleVideos || [])
            setModuleAttachments(d.moduleAttachments || [])
if ((d.modules || []).length > 0) setExpandedModules(new Set([(d.modules[0] as Module).id]))
          }
        }
        if (qRes.ok) {
          const d = await qRes.json()
          if (d.ok) setQuizzes(d.quizzes || [])
        }
        if (exRes.ok) {
          const d = await exRes.json()
          if (d.ok) setExercises(d.exercises || [])
        }
        if (nsRes.ok) {
          const d = await nsRes.json()
          if (d.ok) setNextSession(d.session || null)
        }
      } catch { push("err", "Impossible de charger le groupe") }
      finally  { setLoading(false) }
    }
    load()
  }, [groupId])

  // Curriculum helpers ──────────────────────────────────────────────────────

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
    if (!confirm("Supprimer ce module et toutes ses ressources ?")) return
    try {
      await callCurriculum("DELETE", { type: "module", id: moduleId })
      setModules(p => p.filter(m => m.id !== moduleId))
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
    if (sorted[fromIdx]?.canEdit === false || sorted[toIdx]?.canEdit === false) return
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
    if (sorted.some(m => m.canEdit === false)) return
    callCurriculum("PATCH", { type: "reorder_modules", order: sorted.map(m => m.id) })
      .catch((e: any) => push("err", e.message))
  }

  function buildModuleItems(moduleId: string) {
    return [
      ...moduleVideos.filter(v => v.moduleId === moduleId).map(v => ({ id: v.id, key: `module_video:${v.id}`, order: v.order ?? 0, itype: "module_video" as const, canEdit: v.canEdit !== false })),
      ...moduleAttachments.filter(a => a.moduleId === moduleId).map(a => ({ id: a.id, key: `module_attachment:${a.id}`, order: a.order ?? 999, itype: "module_attachment" as const, canEdit: a.canEdit !== false })),
    ].sort((a, b) => a.order - b.order)
  }

  function handleModuleContentDragOver(e: React.DragEvent, moduleId: string, targetKey: string) {
    e.preventDefault()
    if (!dragModuleContentKey || dragModuleContentKey === targetKey) return
    const allItems = buildModuleItems(moduleId)
    const fromIdx = allItems.findIndex(x => x.key === dragModuleContentKey)
    const toIdx   = allItems.findIndex(x => x.key === targetKey)
    if (!allItems[fromIdx]?.canEdit || !allItems[toIdx]?.canEdit) return
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
    setModuleVideos(p => p.map(v => { const u = newOrders.find(x => x.key === `module_video:${v.id}`); return u ? { ...v, order: u.order } : v }))
    setModuleAttachments(p => p.map(a => { const u = newOrders.find(x => x.key === `module_attachment:${a.id}`); return u ? { ...a, order: u.order } : a }))
    flipAnimate(moduleContentRefs.current, before)
  }

  function handleModuleContentDragEnd(moduleId: string) {
    setDragModuleContentKey(null)
    setDraggingLabel("")
    const allItems = buildModuleItems(moduleId)
    if (allItems.some(x => !x.canEdit)) return
    callCurriculum("PATCH", {
      type: "reorder_module_items",
      items: allItems.map(x => ({ type: x.itype, id: x.id })),
    }).catch((e: any) => push("err", e.message))
  }

  async function deleteQuiz(id: string) {
    if (!confirm("Supprimer ce quiz ?")) return
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/quiz`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setQuizzes(p => p.filter(q => q.id !== id))
      push("ok", "Quiz supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  async function deleteExercise(id: string) {
    if (!confirm("Supprimer cet exercice ?")) return
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/exercice`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setExercises(p => p.filter(ex => ex.id !== id))
      push("ok", "Devoir supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const sortedModules = [...modules].sort((a, b) => a.order - b.order)

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
  const formateurs = (group.instructors && group.instructors.length > 0) ? group.instructors : (group.instructor ? [group.instructor] : [])
  const currentFormateur = formateurs[formateurIndex % Math.max(formateurs.length, 1)]

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
              { id: "apprenants", label: "Apprenants",     icon: Users,     count: group.students.length },
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
              { icon: Users,      value: group.students.length,  label: "Apprenants", iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: LayoutList, value: modules.length,         label: "Modules",   iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: Video,      value: moduleVideos.length,    label: "Vidéos",    iconColor: "#f59e0b", iconBg: "rgba(245,158,11,0.08)" },
              { icon: FileText,   value: moduleAttachments.length, label: "Fichiers", iconColor: "#10b981", iconBg: "rgba(16,185,129,0.08)" },
            ].map((card) => (
              <GroupKpiCard key={card.label} {...card} />
            ))}
          </div>

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
              {currentFormateur && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Formateur</p>
                    {formateurs.length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button type="button" aria-label="Formateur précédent" onClick={() => setFormateurIndex(i => (i - 1 + formateurs.length) % formateurs.length)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid color-mix(in oklch, var(--accent) 20%, #e2e8f0)", background: "color-mix(in oklch, var(--accent) 5%, white)", color: "color-mix(in oklch, var(--accent) 82%, black)", cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff" }} onMouseLeave={e => { e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 5%, white)"; e.currentTarget.style.color = "color-mix(in oklch, var(--accent) 82%, black)" }}>‹</button>
                        <button type="button" aria-label="Formateur suivant" onClick={() => setFormateurIndex(i => (i + 1) % formateurs.length)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid color-mix(in oklch, var(--accent) 20%, #e2e8f0)", background: "color-mix(in oklch, var(--accent) 5%, white)", color: "color-mix(in oklch, var(--accent) 82%, black)", cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff" }} onMouseLeave={e => { e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 5%, white)"; e.currentTarget.style.color = "color-mix(in oklch, var(--accent) 82%, black)" }}>›</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {currentFormateur.avatar ? (
                      <img
                        src={currentFormateur.avatar}
                        alt=""
                        style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0, border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)" }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", background: "color-mix(in oklch, var(--accent) 10%, transparent)", border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)" }}>
                        {initials(currentFormateur.name, currentFormateur.surname)}
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>
                        {[currentFormateur.name, currentFormateur.surname].filter(Boolean).join(" ")}
                      </p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <GraduationCap size={11} /> Formateur
                      </p>
                    </div>
                  </div>
                  {formateurs.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 14 }}>
                      {formateurs.map((f, idx) => (
                        <button key={f.id} type="button" aria-label={`Formateur ${idx + 1}`} onClick={() => setFormateurIndex(idx)} style={{ width: idx === formateurIndex % formateurs.length ? 18 : 6, height: 6, borderRadius: 99, border: "none", background: idx === formateurIndex % formateurs.length ? "var(--accent)" : "#cbd5e1", cursor: "pointer", padding: 0, transition: "all 0.15s" }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Next Session card ── */}
              {nextSession && (() => {
                const diffMins = sessionDiffMins(nextSession.date, nextSession.start_time)
                const sessionEnd = new Date(sessionStartDate(nextSession.date, nextSession.start_time).getTime() + nextSession.duration * 60000)
                const isEnded = Date.now() > sessionEnd.getTime()
                if (isEnded) return null
                const canCreate = diffMins <= 60
                const canJoin = diffMins <= 10 && !!nextSession.joinUrl
                const timeLabel = diffMins > 1440
                  ? `Dans ${Math.round(diffMins / 1440)} j`
                  : diffMins > 60
                  ? `Dans ${Math.round(diffMins / 60)} h`
                  : diffMins > 0
                  ? `Dans ${Math.round(diffMins)} min`
                  : "En cours"
                return (
                  <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prochaine Séance</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: diffMins <= 10 ? "#16a34a" : diffMins <= 60 ? "#d97706" : "#6b7280", background: diffMins <= 10 ? "#f0fdf4" : diffMins <= 60 ? "#fffbeb" : "#f8fafc", padding: "2px 8px", borderRadius: 6 }}>{timeLabel}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <Calendar size={13} style={{ color: "#6b7280", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", textTransform: "capitalize" }}>{fmtSessionDate(nextSession.date)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <Clock size={13} style={{ color: "#6b7280", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {nextSession.start_time || "–"}
                        {nextSession.duration ? ` · ${nextSession.duration} min` : ""}
                      </span>
                    </div>
                    {nextSession.title && (
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", margin: "0 0 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextSession.title}</p>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      {!nextSession.joinUrl && (
                        <button
                          disabled={!canCreate || creatingMeet}
                          onClick={async () => {
                            setCreatingMeet(true)
                            try {
                              const res = await fetch("/api/instructor/sessions/live", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sessionId: nextSession.id, instructorId: getInstructorId() }),
                              })
                              const d = await res.json()
                              if (!res.ok) throw new Error(d.error)
                              setNextSession(p => p ? { ...p, joinUrl: d.joinUrl } : p)
                            } catch (e: any) { push("err", e.message) }
                            finally { setCreatingMeet(false) }
                          }}
                          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 10px", background: canCreate ? "var(--accent)" : "#e5e7eb", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, color: canCreate ? "#fff" : "#9ca3af", cursor: canCreate ? "pointer" : "not-allowed", transition: "all 0.15s", boxShadow: canCreate ? "0 2px 8px color-mix(in oklch, var(--accent) 30%, transparent)" : "none" }}
                        >
                          {creatingMeet ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={13} />}
                          {creatingMeet ? "Création…" : "Créer Meet"}
                        </button>
                      )}
                      {nextSession.joinUrl && (
                        <button
                          disabled={!canJoin}
                          onClick={() => window.open(nextSession.joinUrl!, "_blank")}
                          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 10px", background: canJoin ? "#16a34a" : "#e5e7eb", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, color: canJoin ? "#fff" : "#9ca3af", cursor: canJoin ? "pointer" : "not-allowed", transition: "all 0.15s", boxShadow: canJoin ? "0 2px 8px rgba(22,163,74,0.3)" : "none" }}
                        >
                          <Video size={13} /> Rejoindre
                        </button>
                      )}
                    </div>
                    {!canCreate && !nextSession.joinUrl && (
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0", textAlign: "center" }}>Disponible 1h avant la séance</p>
                    )}
                    {nextSession.joinUrl && !canJoin && (
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0", textAlign: "center" }}>Rejoindre disponible 10 min avant</p>
                    )}
                  </div>
                )
              })()}


            </div>

          {/* ── Drag ghost (follows cursor, no browser ghost) ── */}
          <div
            ref={ghostRef}
            style={{ display: (dragModuleId || dragModuleContentKey) ? "flex" : "none", position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 9999, background: "#fff", border: "1.5px solid var(--accent)", borderRadius: 10, padding: "8px 14px", boxShadow: "0 8px 28px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)", fontSize: 13, fontWeight: 600, color: "#111827", maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", alignItems: "center", gap: 8, transform: "translate(0,0)", willChange: "transform" }}
          >
            <GripVertical size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
            {draggingLabel}
          </div>

          {/* ── Modules & ressources – Parcours ── */}
          <div style={{ position: "relative", paddingLeft: 16 }}>
            {/* Left accent line */}
            <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: "linear-gradient(to bottom, var(--accent), color-mix(in oklch, var(--accent) 60%, white))", borderRadius: 99 }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Programme</span>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
                <span style={{ color: "#d1d5db", fontSize: 13 }}>·</span>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{moduleVideos.length + moduleAttachments.length} ressource{moduleVideos.length + moduleAttachments.length !== 1 ? "s" : ""}</span>
              </div>
              <button
                onClick={() => setAddingModule(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--accent)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 35%, transparent)", flexShrink: 0 }}
              >
                <Plus size={13} /> Module
              </button>
            </div>

            {/* Inline new module */}
            {addingModule && (
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
                const modResourcesCount = moduleVideos.filter(v => v.moduleId === mod.id).length + moduleAttachments.filter(a => a.moduleId === mod.id).length
                const isExpanded = expandedModules.has(mod.id)
                const isEditingMod = editingModuleId === mod.id
                const canEditMod = mod.canEdit !== false
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
                        {isEditingMod && canEditMod ? (
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
                          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{modResourcesCount} ressource{modResourcesCount !== 1 ? "s" : ""}</span>
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
                        {isEditingMod && canEditMod ? (
                          <>
                            <button onClick={() => saveModuleTitle(mod.id)} style={{ padding: "3px 8px", background: "var(--accent)", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>OK</button>
                            <button onClick={() => setEditingModuleId(null)} style={{ padding: "3px 7px", background: "#f4f6fb", border: "1px solid #e8ecf3", borderRadius: 6, fontSize: 11, color: "#6b7280", cursor: "pointer" }}><X size={11} /></button>
                          </>
                        ) : (
                          <>
                            {canEditMod && (
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
                              </>
                            )}
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
                            const grip = (label: string) => item.canEdit ? (
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
                            ) : null

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
                                    {item.canEdit && <button onClick={async () => {
                                      try { await callCurriculum("DELETE", { type: "module_video", id: vid.id }); setModuleVideos(p => p.filter(x => x.id !== vid.id)) }
                                      catch (e: any) { push("err", e.message) }
                                    }} style={{ padding: "3px 5px", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                    ><Trash2 size={12} /></button>}
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
                                onClick={() => { if (pdfUrl) { router.push(pdfUrl) } else if (att.url) { const a = document.createElement("a"); a.href = att.url; a.download = att.name; a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a) } }}
                                style={{ ...baseRow, cursor: att.url ? "pointer" : "default" }}
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
                                  {item.canEdit && <button onClick={async () => {
                                    try { await callCurriculum("DELETE", { type: "module_attachment", id: att.id }); setModuleAttachments(p => p.filter(x => x.id !== att.id)) }
                                    catch (e: any) { push("err", e.message) }
                                  }} style={{ padding: "3px 5px", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                  ><Trash2 size={12} /></button>}
                                  {grip(att.name)}
                                </div>
                              </div>
                            )
                          })}

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

                          {/* Quiz items for this module */}
                          {quizzes.filter(q => q.moduleId === mod.id).map(quiz => (
                            <div key={quiz.id} style={{ borderTop: "1px solid #f0f1f5" }}>
                              <div
                                style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", cursor: "pointer", transition: "background 0.12s" }}
                                onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/quiz/${quiz.id}`)}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f0f9ff"}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                              >
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <BrainCircuit size={16} strokeWidth={2.5} color="#fff" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Quiz</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{quiz.title}</span>
                                    {quiz.deadline && (
                                      <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Deadline: {fmtDeadline(quiz.deadline)}</span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/quiz/${quiz.id}/submissions`)}
                                    style={{ padding: "4px 8px", background: "color-mix(in oklch, var(--accent) 7%, white)", border: "1px solid color-mix(in oklch, var(--accent) 22%, white)", borderRadius: 6, cursor: "pointer", color: "var(--accent)", fontSize: 11, fontWeight: 700, transition: "all 0.12s", display: "flex", alignItems: "center", gap: 4 }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 14%, white)" }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 7%, white)" }}
                                  ><Users size={11} /> Soumissions</button>
                                  <button onClick={() => deleteQuiz(quiz.id)}
                                    style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                  ><Trash2 size={13} /></button>
                                  <ChevronRight size={14} style={{ color: "#d1d5db" }} />
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Exercise items for this module */}
                          {exercises.filter(ex => ex.moduleId === mod.id).map(ex => {
                            const isOverdue = ex.deadline ? new Date(ex.deadline) < new Date() : false
                            return (
                              <div key={ex.id} style={{ borderTop: "1px solid #f0f1f5" }}>
                                <div
                                  style={{ display: "flex", alignItems: "center", gap: 0, cursor: "pointer", transition: "background 0.15s", background: "transparent" }}
                                  onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/exercice/${ex.id}`)}
                                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(6,182,212,0.04)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                                >
                                  <div style={{ width: 4, minWidth: 4, alignSelf: "stretch", background: "linear-gradient(to bottom, #06b6d4, #0891b2)", borderRadius: "0 2px 2px 0" }} />
                                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px 13px 16px", flex: 1, minWidth: 0 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#0891b2,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 10px rgba(6,182,212,0.32)" }}>
                                      <ClipboardCheck size={17} strokeWidth={2.3} color="#fff" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#0891b2", background: "rgba(6,182,212,0.1)", padding: "1px 7px", borderRadius: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>Devoir</span>
                                        {ex.deadline && (
                                          <span style={{ fontSize: 11, fontWeight: 500, color: isOverdue ? "#dc2626" : "#9ca3af", whiteSpace: "nowrap" }}>
                                            · {isOverdue ? "Délai dépassé —" : "À rendre le"} {fmtDeadline(ex.deadline)}
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.title}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                                      <button
                                        onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/exercice/${ex.id}/submissions`)}
                                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "rgba(6,182,212,0.08)", border: "1.5px solid rgba(6,182,212,0.22)", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#0891b2", transition: "all 0.12s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(6,182,212,0.16)" }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(6,182,212,0.08)" }}
                                      ><Users size={11} /> Copies</button>
                                      <button onClick={() => deleteExercise(ex.id)}
                                        style={{ padding: "5px 7px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                      ><Trash2 size={13} /></button>
                                      <ChevronRight size={14} style={{ color: "#d1d5db" }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}

                          {/* Action buttons */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 20px", borderTop: "1px solid #f0f1f5" }}>
                            <button
                              onClick={() => { setAddingModuleVideoFor(mod.id) }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#f59e0b", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", boxShadow: "0 2px 8px rgba(245,158,11,0.35)", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#d97706" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f59e0b" }}
                            ><Video size={12} /> Vidéo</button>
                            <button
                              onClick={() => { setUploadingModuleFor(mod.id); moduleFileInputRef.current?.click() }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#14b8a6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", boxShadow: "0 2px 8px rgba(20,184,166,0.35)", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0d9488" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#14b8a6" }}
                            ><Paperclip size={12} /> Fichier</button>
                            <button
                              onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/quiz/new?moduleId=${mod.id}`)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--accent)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 35%, transparent)", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
                            ><BrainCircuit size={12} /> Quiz</button>
                            <button
                              onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/exercice/new?moduleId=${mod.id}`)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 13px", background: "linear-gradient(135deg,#0891b2,#06b6d4)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff", boxShadow: "0 2px 8px rgba(6,182,212,0.35)", transition: "all 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
                            ><ClipboardCheck size={12} /> Devoir</button>
                          </div>
                        </div>
                      )
                    })()}
                    </motion.div>
                  </div>
                )
              })}
            </div>

            </div>
        </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ÉTUDIANTS ──────────────────────────────────────────────────── */}
      {activeTab === "apprenants" && (
        <div style={{ padding: "24px 28px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Apprenants inscrits</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: "color-mix(in oklch, var(--accent) 85%, black)", background: "color-mix(in oklch, var(--accent) 8%, transparent)", padding: "2px 10px", borderRadius: 99, border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)" }}>
              {group.students.length}
            </span>
          </div>
          {group.students.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "56px 24px", textAlign: "center" }}>
              <Users size={36} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Aucun apprenant inscrit dans ce groupe</p>
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
                  <div style={{ minWidth: 0, flex: 1 }}>
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

        </motion.div>
      </AnimatePresence>

      {/* ─── Hidden file inputs ── */}
      <input ref={moduleFileInputRef} type="file" style={{ display: "none" }} onChange={async e => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file || !uploadingModuleFor) return
        const moduleId = uploadingModuleFor
        setUploadingModuleFor(null)
        const allCount = moduleVideos.filter(v => v.moduleId === moduleId).length + moduleAttachments.filter(a => a.moduleId === moduleId).length
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



const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", background: "var(--accent)",
  border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff",
  cursor: "pointer", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 28%, transparent)",
}
