"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Edit, Trash2, Save, X,
  Users, CheckCircle, AlertCircle, Loader2,
  Layers, BookOpen, Lock, Unlock, ChevronRight, Link2,
  Wifi, MapPin, MonitorSmartphone, HelpCircle, GraduationCap
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

// ---- Types ----
type ToastType = "success" | "error" | "loading"
type Toast = { id: string; type: ToastType; message: string; duration: number; createdAt: number }

type AdminCourse = { id: string; title: string; shortDescription?: string; longDescription?: string; coverImage?: string | null }
type AdminBootcamp = { id: string; title: string; shortDescription?: string; longDescription?: string; coverImage?: string | null }
type AdminStudent = { id: string; name?: string; surname?: string; email?: string; username?: string }

type GroupStatus = "not_started" | "in_progress" | "completed"

type AdminInstructor = { id: string; name?: string; surname?: string }

type AdminGroup = {
  id?: string
  title: string
  status: GroupStatus
  programType: "course" | "bootcamp"
  courseId?: string | null
  bootcampId?: string | null
  instructorId?: string | null
  studentIds: string[]
  instructor?: AdminInstructor | null
  lockedModules?: string[]
  unlockedModules?: string[]
  lockedLessons?: string[]
  unlockedLessons?: string[]
}

type AdminSession = {
  id: string
  group: string
  date: string
  start_time: string
  duration: number
  mode?: "live" | "presentiel" | "live_presentiel" | "not_set" | string
  title: string | null
  is_cancelled: boolean
}

type CurriculumData = {
  courses?: { id: string, title: string }[],
  modules: { id: string, title: string, courseId?: string, locked: boolean }[],
  lessons: { id: string, title: string, moduleId: string, locked: boolean }[]
}

type GroupsCrudProps = {
  initialGroups?: AdminGroup[]
  initialCourses?: AdminCourse[]
  initialBootcamps?: AdminBootcamp[]
  initialStudents?: AdminStudent[]
  initialInstructors?: AdminInstructor[]
  onSave?: (group: AdminGroup) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  readOnly?: boolean
  onGroupClick?: (group: AdminGroup) => void
}

// ---- Status meta ----
const STATUS_META: Record<GroupStatus, { label: string; bg: string; text: string }> = {
  not_started: { label: "Pas commencé", bg: "rgba(148,163,184,0.15)", text: "#64748b" },
  in_progress:  { label: "En cours",     bg: "rgba(59,130,246,0.15)",  text: "#2563eb" },
  completed:    { label: "Terminé",      bg: "rgba(34,197,94,0.15)",   text: "#16a34a" },
}

function studentDisplayName(s: AdminStudent) {
  const full = `${s.name ?? ""} ${s.surname ?? ""}`.trim()
  return full || s.username || s.email || s.id
}

function currentMonthLabel() {
  return new Date().toLocaleString("fr-FR", { month: "short" }).toUpperCase()
}

function buildAutoTitle(name: string) {
  const safe = (name || "").trim()
  return safe ? `${safe} - ${currentMonthLabel()}` : currentMonthLabel()
}

function sessionStartAt(session: AdminSession): number {
  const time = session.start_time || "00:00"
  return new Date(`${session.date}T${time}:00`).getTime()
}

function formatSessionDate(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })
}

function getSessionModeMeta(mode?: string) {
  if (mode === "live") {
    return { label: "Live", color: "#2563eb", icon: Wifi }
  }
  if (mode === "presentiel") {
    return { label: "Presentiel", color: "#16a34a", icon: MapPin }
  }
  if (mode === "live_presentiel") {
    return { label: "Live + Presentiel", color: "#7c3aed", icon: MonitorSmartphone }
  }
  return { label: "Mode non defini", color: "#94a3b8", icon: HelpCircle }
}

function formatDurationHM(minutes?: number): string {
  if (!minutes || minutes <= 0) return ""
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}`
}

// ---- UI primitives (exact match of CoursesCrud / BootcampsCrud) ----

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {children}{required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
    </label>
  )
}

function Input({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties
}) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s", ...style }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
    />
  )
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", appearance: "none", cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <ChevronRight style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }} />
    </div>
  )
}

function IconBtn({ onClick, title, color = "#64748b", hoverBg = "#f1f5f9", children }: {
  onClick: (e: React.MouseEvent) => void; title?: string; color?: string; hoverBg?: string; children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: 7, borderRadius: 8, border: "none", background: hover ? hoverBg : "transparent", color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
    >
      {children}
    </button>
  )
}

function FormCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #edf0f7", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "14px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfe 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(129,140,248,0.05))", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: "20px 22px" }}>{children}</div>
    </div>
  )
}

// ---- Main component ----

export default function GroupsCrud({
  initialGroups = [],
  initialCourses = [],
  initialBootcamps = [],
  initialStudents = [],
  initialInstructors = [],
  onSave,
  onDelete,
  readOnly = false,
  onGroupClick,
}: GroupsCrudProps) {
  const router = useRouter()
  const [toasts, setToasts]             = useState<Toast[]>([])
  const [groups, setGroups]             = useState<AdminGroup[]>(initialGroups)
  const [courses, setCourses]           = useState<AdminCourse[]>(initialCourses)
  const [bootcamps, setBootcamps]       = useState<AdminBootcamp[]>(initialBootcamps)
  const [students, setStudents]         = useState<AdminStudent[]>(initialStudents)
  const [instructors]                   = useState<AdminInstructor[]>(initialInstructors)

  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null)
  const [isCreating, setIsCreating]     = useState(false)
  const [searchTerm, setSearchTerm]     = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | GroupStatus>("all")
  const [filterType, setFilterType]     = useState<"all" | "course" | "bootcamp">("all")
  const [studentSearch, setStudentSearch] = useState("")
  const [loading, setLoading]           = useState(false)
  const [sessions, setSessions]         = useState<AdminSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const [curriculum, setCurriculum]               = useState<CurriculumData | null>(null)
  const [loadingCurriculum, setLoadingCurriculum] = useState(false)
  const [statusPopover, setStatusPopover]         = useState<string | null>(null)

  // ---- Toast helpers ----
  const showToast = (type: ToastType, message: string, duration = 4500) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    setToasts(prev => [...prev, { id, type, message, duration, createdAt: Date.now() }])
    if (type !== "loading") setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    return id
  }
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(t => t.type === "loading" || now - t.createdAt < t.duration))
    }, 100)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { if (initialGroups.length)   setGroups(initialGroups)     }, [initialGroups])
  useEffect(() => { if (initialCourses.length)   setCourses(initialCourses)   }, [initialCourses])
  useEffect(() => { if (initialBootcamps.length) setBootcamps(initialBootcamps) }, [initialBootcamps])
  useEffect(() => { if (initialStudents.length)  setStudents(initialStudents)  }, [initialStudents])

  useEffect(() => {
    let active = true
    const loadSessions = async () => {
      setLoadingSessions(true)
      try {
        const res = await fetch("/api/admin/sessions")
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setSessions(Array.isArray(data.sessions) ? data.sessions : [])
      } catch {
        if (active) setSessions([])
      } finally {
        if (active) setLoadingSessions(false)
      }
    }
    loadSessions()
    return () => { active = false }
  }, [])

  // ---- Curriculum loader ----
  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingCurriculum(true)
      try {
        let res
        if (editingGroup?.programType === "course" && editingGroup.courseId)
          res = await fetch(`/api/admin/courses/${editingGroup.courseId}/curriculum`)
        else if (editingGroup?.programType === "bootcamp" && editingGroup.bootcampId)
          res = await fetch(`/api/admin/bootcamps/${editingGroup.bootcampId}/curriculum`)
        else { if (active) setCurriculum(null); return }

        if (res?.ok) {
          const data = await res.json()
          if (data.ok && active) setCurriculum(data.curriculum)
        }
      } catch { if (active) setCurriculum(null) }
      finally  { if (active) setLoadingCurriculum(false) }
    }
    load()
    return () => { active = false }
  }, [editingGroup?.courseId, editingGroup?.bootcampId, editingGroup?.programType])

  // ---- Helpers ----
  const createBlank = (): AdminGroup => ({
    title: "", status: "not_started", programType: "course",
    courseId: "", bootcampId: "", instructorId: null, studentIds: [],
    lockedModules: [], unlockedModules: [], lockedLessons: [], unlockedLessons: [],
  })

  const programLabel = (g: AdminGroup) =>
    g.programType === "course"
      ? (courses.find(c => c.id === g.courseId)?.title   || "Formation")
      : (bootcamps.find(b => b.id === g.bootcampId)?.title || "Bootcamp")

  const filteredGroups = groups.filter(g => {
    const q = searchTerm.toLowerCase()
    if (q && !g.title.toLowerCase().includes(q) && !programLabel(g).toLowerCase().includes(q)) return false
    if (filterStatus !== "all" && g.status !== filterStatus) return false
    if (filterType   !== "all" && g.programType !== filterType) return false
    return true
  })

  const filteredStudents = useMemo(() => {
    const term = studentSearch.toLowerCase().trim()
    if (!term) return students
    return students.filter(s =>
      studentDisplayName(s).toLowerCase().includes(term) ||
      (s.email ?? "").toLowerCase().includes(term)
    )
  }, [students, studentSearch])

  const nextSessionByGroup = useMemo(() => {
    const now = Date.now()
    const nextMap = new Map<string, AdminSession>()
    const inProgressIds = new Set(
      groups
        .filter(g => g.status === "in_progress" && !!g.id)
        .map(g => g.id as string)
    )

    for (const session of sessions) {
      if (!inProgressIds.has(session.group) || session.is_cancelled) continue
      const startsAt = sessionStartAt(session)
      if (!Number.isFinite(startsAt) || startsAt < now) continue
      const existing = nextMap.get(session.group)
      if (!existing || startsAt < sessionStartAt(existing)) {
        nextMap.set(session.group, session)
      }
    }

    return nextMap
  }, [groups, sessions])

  // ---- Handlers ----
  const handleSelectGroup = (g: AdminGroup) => { setEditingGroup(JSON.parse(JSON.stringify(g))); setIsCreating(false) }
  const handleNewGroup    = () => { setEditingGroup(createBlank()); setIsCreating(true) }
  const handleCancelEdit  = () => { setEditingGroup(null); setIsCreating(false) }

  const handleSaveGroup = async () => {
    if (!editingGroup) return
    if (!editingGroup.title.trim()) { showToast("error", "Le nom du groupe est obligatoire"); return }
    if (editingGroup.programType === "course"   && !editingGroup.courseId)   { showToast("error", "Sélectionnez une formation"); return }
    if (editingGroup.programType === "bootcamp" && !editingGroup.bootcampId) { showToast("error", "Sélectionnez un bootcamp"); return }

    setLoading(true)
    const lid = showToast("loading", "Enregistrement en cours…")
    try {
      if (onSave) await onSave(editingGroup)
      if (editingGroup.id) {
        setGroups(prev => prev.map(g => g.id === editingGroup.id ? editingGroup : g))
      } else {
        const ng = { ...editingGroup, id: `group_${Date.now()}` }
        setGroups(prev => [...prev, ng])
        setEditingGroup(ng)
        setIsCreating(false)
      }
      removeToast(lid)
      showToast("success", "Groupe enregistré avec succès !")
    } catch (err: any) {
      removeToast(lid)
      showToast("error", err.message || "Erreur lors de l'enregistrement")
    } finally { setLoading(false) }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Supprimer ce groupe ? Cette action est irréversible.")) return
    try {
      if (onDelete) await onDelete(id)
      setGroups(prev => prev.filter(g => g.id !== id))
      if (editingGroup?.id === id) setEditingGroup(null)
      showToast("success", "Groupe supprimé.")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de la suppression")
    }
  }

  const handleChangeStatus = async (group: AdminGroup, status: GroupStatus) => {
    setStatusPopover(null)
    let updated: AdminGroup = { ...group, status }

    if (status === "completed") {
      try {
        const url = group.programType === "course" && group.courseId
          ? `/api/admin/courses/${group.courseId}/curriculum`
          : group.programType === "bootcamp" && group.bootcampId
          ? `/api/admin/bootcamps/${group.bootcampId}/curriculum`
          : null
        if (url) {
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            if (data.ok && data.curriculum) {
              updated = {
                ...updated,
                lockedModules: [],
                lockedLessons: [],
                unlockedModules: data.curriculum.modules.map((m: any) => m.id),
                unlockedLessons: data.curriculum.lessons.map((l: any) => l.id),
              }
            }
          }
        }
      } catch { /* keep updated as-is */ }
    }

    setGroups(prev => prev.map(g => g.id === group.id ? updated : g))
    try {
      if (onSave) await onSave(updated)
      showToast("success", status === "completed" ? "Groupe terminé — tout le contenu est déverrouillé." : "Statut mis à jour.")
    } catch (err: any) {
      setGroups(prev => prev.map(g => g.id === group.id ? group : g))
      showToast("error", err.message || "Erreur lors de la mise à jour")
    }
  }

  const toggleStudent = (id: string) => {
    if (!editingGroup) return
    const next = editingGroup.studentIds.includes(id)
      ? editingGroup.studentIds.filter(sid => sid !== id)
      : [...editingGroup.studentIds, id]
    setEditingGroup({ ...editingGroup, studentIds: next })
  }

  const getIsUnlocked = (id: string, type: "module" | "lesson") => {
    if (editingGroup?.status === "completed") return true
    return type === "module"
      ? !!editingGroup?.unlockedModules?.includes(id)
      : !!editingGroup?.unlockedLessons?.includes(id)
  }

  const toggleLockState = (id: string, type: "module" | "lesson") => {
    if (!editingGroup) return
    const ng = { ...editingGroup }
    ng.unlockedModules = ng.unlockedModules || []
    ng.unlockedLessons = ng.unlockedLessons || []
    if (type === "module") {
      ng.unlockedModules = ng.unlockedModules.includes(id)
        ? ng.unlockedModules.filter(x => x !== id)
        : [...ng.unlockedModules, id]
    } else {
      ng.unlockedLessons = ng.unlockedLessons.includes(id)
        ? ng.unlockedLessons.filter(x => x !== id)
        : [...ng.unlockedLessons, id]
    }
    setEditingGroup(ng)
  }

  // ---- Render ----
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      <AdminPageHeader
        title="Groupes"
        description="Gérez les groupes et leurs étudiants"
        breadcrumbs={[{ label: "Groupes" }]}
        actions={!readOnly ? (
          <button onClick={handleNewGroup}
            style={{ padding: "9px 20px", background: "var(--accent,#6366f1)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Plus style={{ width: 15, height: 15 }} /> Nouveau groupe
          </button>
        ) : undefined}
      />

      {/* ── Filters bar ── */}
      <div style={{ padding: "14px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8" }} />
          <input type="text" placeholder="Rechercher un groupe…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "7px 12px 7px 34px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
            onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)" }}
            onBlur={e => { e.target.style.borderColor = "#e8ecf3"; e.target.style.boxShadow = "none" }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          style={{ padding: "7px 12px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, color: filterStatus !== "all" ? "var(--accent,#6366f1)" : "#64748b", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
          <option value="all">Statut : tous</option>
          <option value="not_started">Pas commencé</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminé</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          style={{ padding: "7px 12px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, color: filterType !== "all" ? "var(--accent,#6366f1)" : "#64748b", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
          <option value="all">Type : tous</option>
          <option value="course">Formation</option>
          <option value="bootcamp">Bootcamp</option>
        </select>
        <div style={{ fontSize: 13, color: "#94a3b8", marginLeft: "auto" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{filteredGroups.length}</span> groupe{filteredGroups.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ padding: "0px 0px" }}>
        {filteredGroups.length === 0 ? (
          <div style={{ background: "#fff", padding: "64px 24px", textAlign: "center" }}>
            <Users style={{ width: 40, height: 40, color: "#e2e8f0", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#64748b", margin: "0 0 4px" }}>Aucun groupe trouvé</p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              {readOnly ? "Aucun groupe ne correspond aux filtres actuels." : "Créez votre premier groupe avec le bouton ci-dessus."}
            </p>
          </div>
        ) : (() => {
          const STATUS_ORDER: GroupStatus[] = ["in_progress", "not_started", "completed"]
          const renderRow = (group: AdminGroup, idx: number, arr: AdminGroup[], sectionStatus: GroupStatus) => {
            const showSession = sectionStatus === "in_progress"
            const nextSession = group.id ? nextSessionByGroup.get(group.id) : undefined
            const canOpenAgenda = !!(group.id && nextSession && !loadingSessions)
            const cols = showSession ? "1fr 220px" : "1fr"
            const isBootcamp = group.programType === "bootcamp"
            const linked = isBootcamp
              ? bootcamps.find(b => b.id === group.bootcampId)
              : courses.find(c => c.id === group.courseId)
            const collection = isBootcamp ? "bootcamps" : "courses"
            const coverUrl = linked?.coverImage
              ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/${collection}/${linked.id}/${linked.coverImage}`
              : null
            const description = linked?.longDescription || linked?.shortDescription || ""
            const sm = STATUS_META[group.status]
            return (
              <div key={group.id}
                style={{ display: "grid", gridTemplateColumns: cols, padding: "32px 36px", borderBottom: idx < arr.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Title column */}
                <div style={{ minWidth: 0, paddingRight: 24 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                    {/* Cover image with status badge */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {coverUrl ? (
                        <img src={coverUrl} alt="" onClick={() => readOnly ? onGroupClick?.(group) : handleSelectGroup(group)}
                          style={{ width: 320, height: 180, borderRadius: 4, objectFit: "cover", display: "block", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: (readOnly && !onGroupClick) ? "default" : "pointer" }}
                        />
                      ) : (
                        <div onClick={() => readOnly ? onGroupClick?.(group) : handleSelectGroup(group)}
                          style={{ width: 320, height: 180, borderRadius: 4, cursor: (readOnly && !onGroupClick) ? "default" : "pointer", border: "1px solid #f1f5f9", background: isBootcamp ? "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))" : "linear-gradient(135deg,rgba(59,130,246,0.10),rgba(99,102,241,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isBootcamp ? <Layers style={{ width: 30, height: 30, color: "var(--accent,#6366f1)" }} /> : <BookOpen style={{ width: 30, height: 30, color: "#3b82f6" }} />}
                        </div>
                      )}
                      {/* Status badge — top-left corner (clickable) */}
                      <div style={{ position: "absolute", top: 8, left: 8 }}>
                        <span
                          onClick={e => {
                            if (readOnly) return
                            e.stopPropagation()
                            setStatusPopover(statusPopover === group.id ? null : (group.id ?? null))
                          }}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "#fff", color: sm.text, boxShadow: "0 1px 4px rgba(0,0,0,0.12)", letterSpacing: "0.04em", cursor: readOnly ? "default" : "pointer", userSelect: "none" }}
                        >
                          {sm.label}
                          {!readOnly && (
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.5 }}><path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </span>
                        {!readOnly && statusPopover === group.id && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setStatusPopover(null)} />
                            <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 100, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", overflow: "hidden", minWidth: 150 }}>
                              {(Object.entries(STATUS_META) as [GroupStatus, typeof STATUS_META[GroupStatus]][]).map(([s, meta]) => (
                                <div key={s}
                                  onClick={e => { e.stopPropagation(); handleChangeStatus(group, s) }}
                                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", cursor: "pointer", background: group.status === s ? meta.bg : "transparent", transition: "background 0.1s" }}
                                  onMouseEnter={e => { if (group.status !== s) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                                  onMouseLeave={e => { if (group.status !== s) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                                >
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.text, flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, fontWeight: group.status === s ? 700 : 500, color: group.status === s ? meta.text : "#374151" }}>{meta.label}</span>
                                  {group.status === s && <svg style={{ marginLeft: "auto" }} width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={meta.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      {/* Formation / Bootcamp badge above title */}
                      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 6, marginBottom: 8, background: isBootcamp ? "rgba(99,102,241,0.08)" : "rgba(59,130,246,0.08)", color: isBootcamp ? "var(--accent,#6366f1)" : "#3b82f6" }}>
                        {isBootcamp ? "Bootcamp" : "Formation"}
                      </span>
                      <p
                        onClick={() => readOnly ? onGroupClick?.(group) : handleSelectGroup(group)}
                        onMouseEnter={e => { if (!readOnly || onGroupClick) e.currentTarget.style.color = "var(--accent,#6366f1)" }}
                        onMouseLeave={e => { if (!readOnly || onGroupClick) e.currentTarget.style.color = "#0f172a" }}
                        style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", cursor: (readOnly && !onGroupClick) ? "default" : "pointer", transition: "color 0.15s" }}
                      >{group.title || "Sans titre"}</p>
                      <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 10px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{description}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        {group.instructor && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <GraduationCap style={{ width: 13, height: 13, color: "#6366f1", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#4f46e5" }}>
                              {[group.instructor.name, group.instructor.surname].filter(Boolean).join(" ")}
                            </span>
                          </span>
                        )}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Users style={{ width: 13, height: 13, color: "#94a3b8" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{group.studentIds.length} étudiant{group.studentIds.length !== 1 ? "s" : ""}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upcoming session (real data) — only for En cours */}
                {showSession && (
                  <div
                    onClick={() => {
                      if (!canOpenAgenda) return
                      const gid = encodeURIComponent(group.id as string)
                      const date = encodeURIComponent(nextSession!.date)
                      const start = encodeURIComponent(nextSession!.start_time || "")
                      router.push(`/admin-dashboard/agenda?group=${gid}&date=${date}&start_time=${start}`)
                    }}
                    onMouseEnter={e => {
                      if (!canOpenAgenda) return
                      e.currentTarget.style.background = "#f8fafc"
                    }}
                    onMouseLeave={e => {
                      if (!canOpenAgenda) return
                      e.currentTarget.style.background = "transparent"
                    }}
                    className={canOpenAgenda ? "next-session-card is-clickable" : "next-session-card"}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignSelf: "stretch",
                      justifyContent: "flex-start",
                      borderRadius: 10,
                      transition: "background 0.15s ease",
                      cursor: canOpenAgenda ? "pointer" : "default",
                    }}
                    title={canOpenAgenda ? "Ouvrir dans l'agenda" : undefined}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "3px 10px",
                        borderRadius: 6,
                        marginBottom: 8,
                        visibility: "hidden",
                        pointerEvents: "none",
                        alignSelf: "flex-start",
                      }}
                    >
                      {isBootcamp ? "Bootcamp" : "Formation"}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        padding: 0,
                        margin: 0,
                        background: "transparent",
                        color: "#dc2626",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        alignSelf: "flex-start",
                      }}
                    >
                      Prochaine seance
                      <Link2 className="next-session-link-icon" style={{ width: 13, height: 13, color: "#dc2626" }} />
                    </span>
                    {loadingSessions ? (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>Chargement...</span>
                    ) : nextSession ? (
                      <>
                        <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>{formatSessionDate(nextSession.date)}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {nextSession.start_time || "--:--"}
                          {nextSession.duration ? ` • ${formatDurationHM(nextSession.duration)}` : ""}
                        </span>
                        {(() => {
                          const modeMeta = getSessionModeMeta(nextSession.mode)
                          const ModeIcon = modeMeta.icon
                          return (
                            <span
                              style={{
                                fontSize: 12,
                                color: modeMeta.color,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <ModeIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
                              {modeMeta.label}
                            </span>
                          )
                        })()}
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>Aucune session planifiee</span>
                    )}
                  </div>
                )}

              </div>
            )
          }

          return (
            <div>
              {STATUS_ORDER.map(status => {
                let rows = filteredGroups.filter(g => g.status === status)
                if (status === "in_progress") {
                  rows = [...rows].sort((a, b) => {
                    const na = a.id ? nextSessionByGroup.get(a.id) : undefined
                    const nb = b.id ? nextSessionByGroup.get(b.id) : undefined
                    const ta = na ? sessionStartAt(na) : Infinity
                    const tb = nb ? sessionStartAt(nb) : Infinity
                    return ta - tb
                  })
                }
                if (rows.length === 0) return null
                const sm = STATUS_META[status]
                return (
                  <div key={status} style={{ marginBottom: 0 }}>
                    {/* Section header */}
                    <div style={{ padding: "14px 36px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #f1f5f9", background: "#fafbfd" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: sm.text, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: sm.text, textTransform: "uppercase", letterSpacing: "0.07em" }}>{sm.label}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{rows.length} groupe{rows.length !== 1 ? "s" : ""}</span>
                      <div style={{ flex: 1, height: 1, background: "#f1f5f9", marginLeft: 4 }} />
                    </div>
                    {/* Column header */}
                    {(() => {
                      const showSess = status === "in_progress"
                      const hCols = showSess ? "1fr 220px" : "1fr"
                      const headers = ["Groupe", ...(showSess ? ["Prochaine session"] : [])]
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: hCols, padding: "12px 36px", borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
                          {headers.map(h => (
                            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#c4cdd9", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                          ))}
                        </div>
                      )
                    })()}
                    <div style={{ background: "#fff" }}>
                      {rows.map((g, i) => renderRow(g, i, rows, status))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* ── Modal overlay ── */}
      {!readOnly && editingGroup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }} onClick={handleCancelEdit} />
          {(() => {
            const isCompleted = editingGroup.status === "completed"
            return (
          <div className="group-modal-inner" style={{ position: "relative", background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)", width: "100%", maxWidth: 880, maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Accent strip */}
            <div style={{ height: 3, background: isCompleted ? "linear-gradient(90deg,#22c55e,#4ade80,#86efac)" : "linear-gradient(90deg,var(--accent,#6366f1),#818cf8,#a78bfa)", flexShrink: 0 }} />
            {/* Modal header */}
            <div style={{ padding: "20px 28px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "#fff" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: isCompleted ? "#22c55e" : "#a5b4fc", margin: "0 0 4px" }}>
                  {isCompleted ? "Groupe terminé — lecture seule" : isCreating ? "Nouveau groupe" : "Modifier"}
                </p>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{editingGroup.title || "Sans titre"}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!isCompleted && (
                  <button onClick={handleSaveGroup} disabled={loading}
                    style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: loading ? "#f1f5f9" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)" }}
                    onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(99,102,241,0.35)" }}
                  >
                    {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                    {loading ? "Enregistrement…" : "Enregistrer"}
                  </button>
                )}
                <button onClick={handleCancelEdit}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid #e8ecf3", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8ecf3"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.background = "#fff" }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f7f9fc" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Read-only notice */}
                {isCompleted && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderRadius: 12, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <CheckCircle style={{ width: 16, height: 16, color: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#15803d", fontWeight: 500 }}>Ce groupe est terminé. Tout le contenu est déverrouillé. Les informations sont en lecture seule.</span>
                  </div>
                )}

                {/* Editable sections — wrapped in read-only overlay when completed */}
                <div style={{ display: "contents", pointerEvents: isCompleted ? "none" : undefined, opacity: isCompleted ? 0.7 : 1 }}>

                {/* Informations du groupe */}
                <FormCard title="Informations du groupe" icon={<Users style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <FieldLabel required>Nom du groupe</FieldLabel>
                      <Input value={editingGroup.title} onChange={v => setEditingGroup({ ...editingGroup, title: v })} placeholder="Ex : Groupe Data - Mars" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <FieldLabel required>Statut</FieldLabel>
                        <SelectField value={editingGroup.status} onChange={v => setEditingGroup({ ...editingGroup, status: v as GroupStatus })}>
                          <option value="not_started">Pas commencé</option>
                          <option value="in_progress">En cours</option>
                          <option value="completed">Terminé</option>
                        </SelectField>
                      </div>
                      <div>
                        <FieldLabel required>Type de programme</FieldLabel>
                        <SelectField value={editingGroup.programType}
                          onChange={v => setEditingGroup(prev => prev ? { ...prev, programType: v as "course" | "bootcamp", courseId: "", bootcampId: "" } : prev)}>
                          <option value="course">Formation</option>
                          <option value="bootcamp">Bootcamp</option>
                        </SelectField>
                      </div>
                    </div>
                    {editingGroup.programType === "course" ? (
                      <div>
                        <FieldLabel required>Formation liée</FieldLabel>
                        <SelectField value={String(editingGroup.courseId ?? "")}
                          onChange={v => setEditingGroup(prev => {
                            if (!prev) return prev
                            const picked = courses.find(c => c.id === v)
                            return { ...prev, title: prev.title?.trim() ? prev.title : buildAutoTitle(picked?.title || ""), courseId: v, bootcampId: "" }
                          })}>
                          <option value="">Sélectionner une formation</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </SelectField>
                      </div>
                    ) : (
                      <div>
                        <FieldLabel required>Bootcamp lié</FieldLabel>
                        <SelectField value={String(editingGroup.bootcampId ?? "")}
                          onChange={v => setEditingGroup(prev => {
                            if (!prev) return prev
                            const picked = bootcamps.find(b => b.id === v)
                            return { ...prev, title: prev.title?.trim() ? prev.title : buildAutoTitle(picked?.title || ""), bootcampId: v, courseId: "" }
                          })}>
                          <option value="">Sélectionner un bootcamp</option>
                          {bootcamps.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                        </SelectField>
                      </div>
                    )}
                    <div>
                      <FieldLabel>Instructeur</FieldLabel>
                      <SelectField
                        value={editingGroup.instructorId ?? ""}
                        onChange={v => {
                          const picked = instructors.find(i => i.id === v) ?? null
                          setEditingGroup(prev => prev ? { ...prev, instructorId: v || null, instructor: picked } : prev)
                        }}
                      >
                        <option value="">Aucun instructeur</option>
                        {instructors.map(i => (
                          <option key={i.id} value={i.id}>
                            {[i.name, i.surname].filter(Boolean).join(" ") || i.id}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  </div>
                </FormCard>

                {/* Étudiants */}
                <FormCard title="Étudiants du groupe" icon={<Users style={{ width: 16, height: 16 }} />}
                  action={<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{editingGroup.studentIds.length} sélectionné{editingGroup.studentIds.length !== 1 ? "s" : ""}</span>}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ position: "relative" }}>
                      <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8" }} />
                      <input type="text" placeholder="Rechercher un étudiant…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px 9px 34px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
                        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
                        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                      />
                    </div>
                    {filteredStudents.length === 0 ? (
                      <div style={{ padding: "16px", borderRadius: 10, border: "1px dashed #e2e8f0", background: "#f8fafc", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                        Aucun étudiant trouvé.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                        {filteredStudents.map(s => {
                          const active = editingGroup.studentIds.includes(s.id)
                          return (
                            <div key={s.id} onClick={() => toggleStudent(s.id)}
                              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${active ? "rgba(99,102,241,0.25)" : "#e8ecf3"}`, background: active ? "rgba(99,102,241,0.05)" : "#fff", cursor: "pointer", transition: "all 0.12s" }}
                              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "#fff" }}
                            >
                              <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${active ? "var(--accent,#6366f1)" : "#cbd5e1"}`, background: active ? "var(--accent,#6366f1)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
                                {active && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{studentDisplayName(s)}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.email || s.username || s.id}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </FormCard>

                {/* Accès au contenu — always shown for completed groups (all unlocked, read-only) */}
                {(curriculum || loadingCurriculum) && (
                  <FormCard title="Accès au contenu" icon={<Lock style={{ width: 16, height: 16 }} />}>
                    {loadingCurriculum ? (
                      <div style={{ padding: "32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <Loader2 style={{ width: 22, height: 22, color: "#a5b4fc", animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>Chargement du programme…</span>
                      </div>
                    ) : curriculum && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(curriculum.courses?.length ? curriculum.courses : [{ id: "default_course", title: "" }]).map(course => {
                          const mods = curriculum.courses?.length
                            ? curriculum.modules.filter(m => m.courseId === course.id)
                            : curriculum.modules
                          if (mods.length === 0) return null
                          return (
                            <div key={course.id || "default"}>
                              {course.title && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                  <BookOpen style={{ width: 13, height: 13, color: "#94a3b8", flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{course.title}</span>
                                </div>
                              )}
                              {mods.map(mod => {
                                const lessons = curriculum.lessons.filter((l: any) => l.moduleId === mod.id)
                                const modUnlocked = lessons.length > 0 && lessons.some((l: any) => getIsUnlocked(l.id, "lesson"))
                                return (
                                  <div key={mod.id} style={{ borderRadius: 12, border: "1px solid #e8ecf3", overflow: "hidden", marginBottom: 6 }}>
                                    {/* Module row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: modUnlocked ? "rgba(34,197,94,0.04)" : "#fafbfd", borderBottom: lessons.length > 0 ? "1px solid #f1f5f9" : "none" }}>
                                      <div style={{ width: 28, height: 28, borderRadius: 8, background: modUnlocked ? "rgba(34,197,94,0.1)" : "rgba(244,63,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        {modUnlocked
                                          ? <Unlock style={{ width: 13, height: 13, color: "#22c55e" }} />
                                          : <Lock    style={{ width: 13, height: 13, color: "#f43f5e" }} />}
                                      </div>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{mod.title}</span>
                                      {lessons.length > 0 && <span style={{ fontSize: 11, color: "#94a3b8" }}>{lessons.length} leçon{lessons.length !== 1 ? "s" : ""}</span>}
                                    </div>
                                    {/* Lessons */}
                                    {lessons.length > 0 && (
                                      <div style={{ background: "#fff" }}>
                                        {lessons.map((lesson: any, li: number) => {
                                          const lessonUnlocked = getIsUnlocked(lesson.id, "lesson")
                                          return (
                                            <div key={lesson.id}
                                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px 9px 52px", borderBottom: li < lessons.length - 1 ? "1px solid #f8fafc" : "none", transition: "background 0.1s" }}
                                              onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                                              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                                            >
                                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: lessonUnlocked ? "#22c55e" : "#f43f5e", flexShrink: 0 }} />
                                                <span style={{ fontSize: 13, color: "#475569" }}>{lesson.title}</span>
                                              </div>
                                              <button onClick={() => toggleLockState(lesson.id, "lesson")}
                                                style={{ padding: "3px 12px", borderRadius: 20, border: `1.5px solid ${lessonUnlocked ? "rgba(34,197,94,0.25)" : "rgba(244,63,94,0.2)"}`, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, color: lessonUnlocked ? "#16a34a" : "#f43f5e", transition: "all 0.15s", whiteSpace: "nowrap" }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = lessonUnlocked ? "rgba(34,197,94,0.08)" : "rgba(244,63,94,0.06)" }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                              >
                                                {lessonUnlocked ? "Déverrouillé" : "Verrouillé"}
                                              </button>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </FormCard>
                )}

                </div>{/* end read-only wrapper */}

                {/* Résumé */}
                <FormCard title="Résumé" icon={<Layers style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[
                      { label: "Programme",  value: programLabel(editingGroup) },
                      { label: "Statut",     value: STATUS_META[editingGroup.status].label },
                      { label: "Étudiants",  value: String(editingGroup.studentIds.length) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e8ecf3" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </FormCard>

              </div>
            </div>
          </div>
            )
          })()}
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map(toast => {
          if (toast.type === "loading") return null
          const progress = Math.max(0, 100 - ((Date.now() - toast.createdAt) / toast.duration) * 100)
          const ok = toast.type === "success"
          return (
            <div key={toast.id} style={{ position: "relative", overflow: "hidden", background: ok ? "#f0fdf4" : "#fff1f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecdd3"}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: 280, maxWidth: 360, animation: "slideIn 0.2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                {ok ? <CheckCircle style={{ width: 18, height: 18, color: "#22c55e", flexShrink: 0 }} /> : <AlertCircle style={{ width: 18, height: 18, color: "#f43f5e", flexShrink: 0 }} />}
                <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: ok ? "#166534" : "#9f1239", margin: 0 }}>{toast.message}</p>
                <button onClick={() => removeToast(toast.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#94a3b8", display: "flex" }}><X style={{ width: 14, height: 14 }} /></button>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: ok ? "#22c55e" : "#f43f5e", width: `${progress}%`, transition: "width 0.1s linear" }} />
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.97) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .next-session-link-icon{opacity:0;transform:translateX(-6px);transition:opacity 0.16s ease,transform 0.16s ease}
        .next-session-card.is-clickable:hover .next-session-link-icon{opacity:1;transform:translateX(0)}
        .group-modal-inner{animation:modalIn 0.22s cubic-bezier(0.22,1,0.36,1) forwards;font-family:'DM Sans','Inter',sans-serif}
        .group-modal-inner ::-webkit-scrollbar{width:5px}
        .group-modal-inner ::-webkit-scrollbar-track{background:transparent}
        .group-modal-inner ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        .group-modal-inner ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
      `}</style>
    </div>
  )
}
