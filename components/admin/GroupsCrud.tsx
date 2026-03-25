"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Search, Plus, Edit, Trash2, Save, X,
  Users, CheckCircle, AlertCircle, Loader2,
  Layers, BookOpen, Lock, Unlock
} from "lucide-react"

// ---- Types ----
type ToastType = "success" | "error" | "loading"
type Toast = { id: string; type: ToastType; message: string; duration: number; createdAt: number }

type AdminCourse = { id: string; title: string; shortDescription?: string }
type AdminBootcamp = { id: string; title: string; shortDescription?: string }
type AdminStudent = { id: string; name?: string; surname?: string; email?: string; username?: string }

type GroupStatus = "not_started" | "in_progress" | "completed"

type AdminGroup = {
  id?: string
  title: string
  status: GroupStatus
  programType: "course" | "bootcamp"
  courseId?: string | null
  bootcampId?: string | null
  studentIds: string[]
  lockedModules?: string[]
  unlockedModules?: string[]
  lockedLessons?: string[]
  unlockedLessons?: string[]
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
  onSave?: (group: AdminGroup) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

// ---- UI primitives (matching CoursesCrud style) ----
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>
      {children}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
    </label>
  )
}

function Input({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...style }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; e.target.style.background = "#fff" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc" }}
    />
  )
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", appearance: "none", cursor: "pointer", fontFamily: "inherit" }}
        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }}>
        &gt;
      </div>
    </div>
  )
}

function IconBtn({ onClick, title, color = "#64748b", hoverBg = "#f1f5f9", children }: {
  onClick: (e: React.MouseEvent) => void; title?: string; color?: string; hoverBg?: string; children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: 7, borderRadius: 8, border: "none", background: hover ? hoverBg : "transparent", color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
    >
      {children}
    </button>
  )
}

function FormCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const STATUS_META: Record<GroupStatus, { label: string; bg: string; text: string }> = {
  not_started: { label: "Pas commence", bg: "rgba(148,163,184,0.15)", text: "#64748b" },
  in_progress: { label: "En cours", bg: "rgba(59,130,246,0.15)", text: "#2563eb" },
  completed: { label: "Termine", bg: "rgba(34,197,94,0.15)", text: "#16a34a" },
}

function studentDisplayName(s: AdminStudent) {
  const full = `${s.name ?? ""} ${s.surname ?? ""}`.trim()
  if (full) return full
  return s.username || s.email || s.id
}

function currentMonthLabel() {
  return new Date().toLocaleString("en-US", { month: "short" }).toUpperCase()
}

function buildAutoTitle(name: string) {
  const safe = (name || "").trim()
  if (!safe) return currentMonthLabel()
  return `${safe} - ${currentMonthLabel()}`
}

export default function GroupsCrud({
  initialGroups = [],
  initialCourses = [],
  initialBootcamps = [],
  initialStudents = [],
  onSave,
  onDelete,
}: GroupsCrudProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>(initialGroups)
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses)
  const [bootcamps, setBootcamps] = useState<AdminBootcamp[]>(initialBootcamps)
  const [students, setStudents] = useState<AdminStudent[]>(initialStudents)

  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null)
  const [loadingCurriculum, setLoadingCurriculum] = useState(false)

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

  useEffect(() => { if (initialGroups.length) setGroups(initialGroups) }, [initialGroups])
  useEffect(() => { if (initialCourses.length) setCourses(initialCourses) }, [initialCourses])
  useEffect(() => { if (initialBootcamps.length) setBootcamps(initialBootcamps) }, [initialBootcamps])
  useEffect(() => { if (initialStudents.length) setStudents(initialStudents) }, [initialStudents])

  useEffect(() => {
    let active = true
    const loadCurriculum = async () => {
      setLoadingCurriculum(true)
      try {
        let res;
        if (editingGroup?.programType === "course" && editingGroup.courseId) {
          res = await fetch(`/api/admin/courses/${editingGroup.courseId}/curriculum`)
        } else if (editingGroup?.programType === "bootcamp" && editingGroup.bootcampId) {
          res = await fetch(`/api/admin/bootcamps/${editingGroup.bootcampId}/curriculum`)
        } else {
          if (active) setCurriculum(null)
          return
        }
        
        if (res?.ok) {
          const data = await res.json()
          if (data.ok && active) setCurriculum(data.curriculum)
        }
      } catch (err) {
        if (active) setCurriculum(null)
      } finally {
        if (active) setLoadingCurriculum(false)
      }
    }
    loadCurriculum()
    return () => { active = false }
  }, [editingGroup?.courseId, editingGroup?.bootcampId, editingGroup?.programType])

  const createBlankGroup = (): AdminGroup => ({
    title: "",
    status: "not_started",
    programType: "course",
    courseId: "",
    bootcampId: "",
    studentIds: [],
    lockedModules: [],
    unlockedModules: [],
    lockedLessons: [],
    unlockedLessons: [],
  })

  const filteredGroups = groups.filter(g =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectGroup = (group: AdminGroup) => {
    setEditingGroup(JSON.parse(JSON.stringify(group)))
    setIsCreating(false)
  }

  const handleNewGroup = () => {
    setEditingGroup(createBlankGroup())
    setIsCreating(true)
  }

  const handleCancelEdit = () => {
    setEditingGroup(null)
    setIsCreating(false)
  }

  const handleSaveGroup = async () => {
    if (!editingGroup) return
    if (!editingGroup.title.trim()) { showToast("error", "Le nom du groupe est obligatoire"); return }
    if (editingGroup.programType === "course" && !editingGroup.courseId) { showToast("error", "Selectionnez une formation"); return }
    if (editingGroup.programType === "bootcamp" && !editingGroup.bootcampId) { showToast("error", "Selectionnez un bootcamp"); return }

    setLoading(true)
    const lid = showToast("loading", "Enregistrement en cours...")

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
      showToast("success", "Groupe enregistre avec succes")
    } catch (err: any) {
      removeToast(lid)
      showToast("error", err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Supprimer ce groupe ? Cette action est irreversible.")) return
    try {
      if (onDelete) await onDelete(id)
      setGroups(prev => prev.filter(g => g.id !== id))
      if (editingGroup?.id === id) setEditingGroup(null)
      showToast("success", "Groupe supprime")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de la suppression")
    }
  }

  const programLabel = (g: AdminGroup) =>
    g.programType === "course"
      ? (courses.find(c => c.id === g.courseId)?.title || "Formation")
      : (bootcamps.find(b => b.id === g.bootcampId)?.title || "Bootcamp")

  const filteredStudents = useMemo(() => {
    const term = studentSearch.toLowerCase().trim()
    if (!term) return students
    return students.filter(s => studentDisplayName(s).toLowerCase().includes(term) || (s.email ?? "").toLowerCase().includes(term))
  }, [students, studentSearch])

  const toggleStudent = (id: string) => {
    if (!editingGroup) return
    const exists = editingGroup.studentIds.includes(id)
    const next = exists
      ? editingGroup.studentIds.filter(sid => sid !== id)
      : [...editingGroup.studentIds, id]
    setEditingGroup({ ...editingGroup, studentIds: next })
  }

  const getIsUnlocked = (id: string, type: "module" | "lesson") => {
    if (!editingGroup) return false
    if (type === "module") {
      return !!editingGroup.unlockedModules?.includes(id)
    } else {
      return !!editingGroup.unlockedLessons?.includes(id)
    }
  }

  const toggleLockState = (id: string, type: "module" | "lesson") => {
    if (!editingGroup) return
    const nextGroup = { ...editingGroup }
    nextGroup.unlockedModules = nextGroup.unlockedModules || []
    nextGroup.unlockedLessons = nextGroup.unlockedLessons || []

    if (type === "module") {
      const isUnlocked = nextGroup.unlockedModules.includes(id)
      if (isUnlocked) {
        nextGroup.unlockedModules = nextGroup.unlockedModules.filter(x => x !== id)
      } else {
        nextGroup.unlockedModules.push(id)
      }
    } else {
      const isUnlocked = nextGroup.unlockedLessons.includes(id)
      if (isUnlocked) {
        nextGroup.unlockedLessons = nextGroup.unlockedLessons.filter(x => x !== id)
      } else {
        nextGroup.unlockedLessons.push(id)
      }
    }
    setEditingGroup(nextGroup)
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "#f0f2f8", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>

      {/* Left panel */}
      <div style={{ width: 420, minWidth: 420, background: "#fff", borderRight: "1px solid #e8ecf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "24px 22px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 2 }}>Gestion</p>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Groupes</h1>
            </div>
            <div style={{ background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", borderRadius: 12, padding: "6px 16px", fontSize: 22, fontWeight: 800 }}>{groups.length}</div>
          </div>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Rechercher un groupe..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
              onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
            />
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <button
            onClick={handleNewGroup}
            style={{ width: "100%", padding: "10px 16px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)", transition: "opacity 0.15s,transform 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "none" }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Nouveau groupe
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {filteredGroups.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Users style={{ width: 40, height: 40, color: "#cbd5e1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Aucun groupe trouve</p>
            </div>
          ) : filteredGroups.map(group => {
            const isActive = editingGroup?.id === group.id
            const status = STATUS_META[group.status]
            return (
              <div
                key={group.id}
                onClick={() => handleSelectGroup(group)}
                style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 4, background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(129,140,248,0.05))" : "transparent", border: isActive ? "1.5px solid rgba(99,102,241,0.2)" : "1.5px solid transparent", transition: "all 0.15s", position: "relative" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
              >
                {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 28, background: "var(--accent,#6366f1)", borderRadius: "0 3px 3px 0" }} />}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent,#6366f1)" : "#0f172a", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {group.title || "Sans titre"}
                    </p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{programLabel(group)}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
                      <span style={{ fontSize: 11, color: status.text, background: status.bg, padding: "3px 8px", borderRadius: 999 }}>{status.label}</span>
                      <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}><Users style={{ width: 11, height: 11 }} />{group.studentIds.length} etudiants</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <IconBtn onClick={e => { e.stopPropagation(); handleSelectGroup(group) }} color="var(--accent,#6366f1)" hoverBg="rgba(99,102,241,0.08)"><Edit style={{ width: 13, height: 13 }} /></IconBtn>
                    <IconBtn onClick={e => { e.stopPropagation(); group.id && handleDeleteGroup(group.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {editingGroup ? (
          <>
            <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf3", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>{isCreating ? "Nouveau groupe" : "Modifier le groupe"}</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>{editingGroup.title || "Sans titre"}</h2>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCancelEdit}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#f43f5e"; (e.currentTarget as HTMLButtonElement).style.color = "#f43f5e" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b" }}
                >
                  <X style={{ width: 14, height: 14 }} /> Annuler
                </button>
                <button onClick={handleSaveGroup} disabled={loading}
                  style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: loading ? "#e2e8f0" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.3)" }}
                >
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

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
                          <option value="not_started">Pas commence</option>
                          <option value="in_progress">En cours</option>
                          <option value="completed">Termine</option>
                        </SelectField>
                      </div>
                      <div>
                        <FieldLabel required>Type de programme</FieldLabel>
                        <SelectField
                          value={editingGroup.programType}
                          onChange={v =>
                            setEditingGroup(prev => prev ? { ...prev, programType: v as "course" | "bootcamp", courseId: "", bootcampId: "" } : prev)
                          }
                        >
                          <option value="course">Formation</option>
                          <option value="bootcamp">Bootcamp</option>
                        </SelectField>
                      </div>
                    </div>
                    {editingGroup.programType === "course" ? (
                      <div>
                        <FieldLabel required>Formation liee</FieldLabel>
                        <SelectField
                          value={String(editingGroup.courseId ?? "")}
                          onChange={v =>
                            setEditingGroup(prev => {
                              if (!prev) return prev
                              const picked = courses.find(c => c.id === v)
                              const nextTitle = prev.title?.trim() ? prev.title : buildAutoTitle(picked?.title || "")
                              return { ...prev, title: nextTitle, courseId: v, bootcampId: "" }
                            })
                          }
                        >
                          <option value="">Selectionner une formation</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </SelectField>
                      </div>
                    ) : (
                      <div>
                        <FieldLabel required>Bootcamp lie</FieldLabel>
                        <SelectField
                          value={String(editingGroup.bootcampId ?? "")}
                          onChange={v =>
                            setEditingGroup(prev => {
                              if (!prev) return prev
                              const picked = bootcamps.find(b => b.id === v)
                              const nextTitle = prev.title?.trim() ? prev.title : buildAutoTitle(picked?.title || "")
                              return { ...prev, title: nextTitle, bootcampId: v, courseId: "" }
                            })
                          }
                        >
                          <option value="">Selectionner un bootcamp</option>
                          {bootcamps.map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                          ))}
                        </SelectField>
                      </div>
                    )}
                  </div>
                </FormCard>

                <FormCard title="Etudiants du groupe" icon={<Users style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8" }} />
                        <input
                          type="text"
                          placeholder="Rechercher un etudiant..."
                          value={studentSearch}
                          onChange={e => setStudentSearch(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px 8px 30px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 12, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{editingGroup.studentIds.length} selectionnes</div>
                    </div>

                    {filteredStudents.length === 0 ? (
                      <div style={{ padding: "16px", borderRadius: 10, border: "1px dashed #e2e8f0", background: "#f8fafc", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                        Aucun etudiant trouve.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                        {filteredStudents.map(s => {
                          const active = editingGroup.studentIds.includes(s.id)
                          return (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: "1px solid #e8ecf3", background: active ? "rgba(99,102,241,0.06)" : "#fff" }}>
                              <input type="checkbox" checked={active} onChange={() => toggleStudent(s.id)} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{studentDisplayName(s)}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.email || s.username || s.id}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </FormCard>

                {curriculum && (
                  <FormCard title="Verrouillage du contenu" icon={<BookOpen style={{ width: 16, height: 16 }} />}>
                    {loadingCurriculum ? (
                      <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>Forcez le verrouillage ou le déverrouillage de modules et leçons spécifiquement pour ce groupe.</p>
                        
                        {(curriculum.courses?.length ? curriculum.courses : [{ id: "default_course", title: "" }]).map(course => {
                          const courseModules = curriculum.courses?.length ? curriculum.modules.filter(m => m.courseId === course.id) : curriculum.modules;
                          if (courseModules.length === 0) return null;
                          return (
                            <div key={course.id || "default"} style={{ marginBottom: 16 }}>
                              {course.title && <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>Formation: {course.title}</h4>}
                              {courseModules.map(mod => (
                                <div key={mod.id} style={{ background: "#f8fafc", border: "1px solid #e8ecf3", borderRadius: 12, padding: "16px", marginBottom: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", flex: 1 }}>Module: {mod.title}</div>
                                    <div style={{ flexShrink: 0 }}>
                                      <button
                                        onClick={() => toggleLockState(mod.id, "module")}
                                        title={getIsUnlocked(mod.id, "module") ? "Verrouiller le module" : "Déverrouiller le module"}
                                        style={{
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                                          background: getIsUnlocked(mod.id, "module") ? "rgba(34,197,94,0.1)" : "rgba(244,63,94,0.1)",
                                          color: getIsUnlocked(mod.id, "module") ? "#22c55e" : "#f43f5e",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {getIsUnlocked(mod.id, "module") ? <Unlock style={{ width: 16, height: 16 }} /> : <Lock style={{ width: 16, height: 16 }} />}
                                      </button>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 16, borderLeft: "2px solid #e2e8f0" }}>
                                    {curriculum.lessons.filter((l: any) => l.moduleId === mod.id).map((lesson: any) => (
                                      <div key={lesson.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ fontSize: 13, color: "#475569", flex: 1 }}>{lesson.title}</div>
                                        <div style={{ flexShrink: 0 }}>
                                          <button
                                            onClick={() => toggleLockState(lesson.id, "lesson")}
                                            title={getIsUnlocked(lesson.id, "lesson") ? "Verrouiller la leçon" : "Déverrouiller la leçon"}
                                            style={{
                                              display: "flex", alignItems: "center", justifyContent: "center",
                                              padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                                              background: getIsUnlocked(lesson.id, "lesson") ? "rgba(34,197,94,0.1)" : "rgba(244,63,94,0.1)",
                                              color: getIsUnlocked(lesson.id, "lesson") ? "#22c55e" : "#f43f5e",
                                              transition: "all 0.15s"
                                            }}
                                          >
                                            {getIsUnlocked(lesson.id, "lesson") ? <Unlock style={{ width: 14, height: 14 }} /> : <Lock style={{ width: 14, height: 14 }} />}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </FormCard>
                )}

                <FormCard title="Resume" icon={<Layers style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", border: "1px solid #e8ecf3" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Programme</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{programLabel(editingGroup)}</div>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", border: "1px solid #e8ecf3" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Etudiants</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{editingGroup.studentIds.length}</div>
                    </div>
                  </div>
                </FormCard>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen style={{ width: 36, height: 36, color: "var(--accent,#6366f1)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Aucun groupe selectionne</h3>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Choisissez un groupe dans la liste ou creez-en un nouveau.</p>
            </div>
            <button onClick={handleNewGroup} style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
              <Plus style={{ width: 16, height: 16 }} /> Creer un groupe
            </button>
          </div>
        )}
      </div>

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
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
      `}</style>
    </div>
  )
}
