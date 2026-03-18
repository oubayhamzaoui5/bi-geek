"use client"

import { useState, useEffect, useRef } from "react"
import {
  Search, Plus, Edit, Trash2, Eye,
  ChevronUp, ChevronDown, Save, X,
  BookOpen, Star,
  CheckCircle, AlertCircle, Loader2,
  Layers, Clock, Award, Tag, Video, Paperclip, ChevronRight,
  Upload, FileText, Youtube, ImagePlus, Film
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "loading"
type Toast = { id: string; type: ToastType; message: string; duration: number; createdAt: number }

type AdminLesson = {
  id?: string; title: string; durationLabel: string; order?: number
  locked?: boolean
  attachments?: File[]; attachmentsMeta?: AttachmentMeta[]; youtubeLinks?: YoutubeLinkItem[]
}
type AdminModule = { id?: string; title: string; durationLabel: string; order?: number; locked?: boolean; lessons: AdminLesson[] }
type CertificationItem = { title: string; issuer?: string; description?: string }
type AttachmentMeta = { name: string; title?: string; description?: string; order?: number }
type YoutubeLinkItem = { url: string; title?: string; description?: string; order?: number }
type LessonResource = {
  kind: "attachment" | "youtube"
  index: number
  order: number
  title: string
  description?: string
  name?: string
  url?: string
}

type AdminCourse = {
  id?: string; title: string; shortDescription: string; longDescription: string
  durationLabel: string; prerequis: "Aucun" | "Contacter l'administration"
  certificate: boolean; certifications: CertificationItem[]
  rating: number; reviewsCount: number; whatYouWillLearn: string[]
  tags: string[]; modules: AdminModule[]
  coverImage?: File | string | null; coverPreview?: string | null
}

type CoursesCrudProps = {
  initialCourses?: AdminCourse[]
  onSave?: (course: AdminCourse) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeModulesOrder = (modules: AdminModule[]): AdminModule[] =>
  modules.map((m, mi) => ({ ...m, order: mi + 1, lessons: m.lessons.map((l, li) => ({ ...l, order: li + 1 })) }))

const getFileName = (file: File | string) => typeof file === "string" ? file : file.name
const stripFileExtension = (name: string) => name.replace(/\.[^.]+$/, "")

const normalizeLessonResources = (lesson: AdminLesson): AdminLesson => {
  const attachments = lesson.attachments ?? []
  const existingMeta = lesson.attachmentsMeta ?? []
  const normalizedMeta: AttachmentMeta[] = attachments.map((file, idx) => {
    const name = getFileName(file)
    const prev = existingMeta[idx] ?? { name }
    return {
      name,
      title: prev.title ?? stripFileExtension(prev.name ?? name),
      description: prev.description ?? "",
      order: prev.order,
    }
  })

  const youtubeLinks: YoutubeLinkItem[] = (lesson.youtubeLinks ?? []).map((link, idx) => ({
    url: link.url ?? "",
    title: link.title ?? link.description ?? `Vidéo ${idx + 1}`,
    description: link.description ?? "",
    order: link.order,
  }))

  const resources = [
    ...normalizedMeta.map((m, i) => ({ kind: "attachment" as const, index: i, order: m.order ?? 0, fallback: i })),
    ...youtubeLinks.map((l, i) => ({ kind: "youtube" as const, index: i, order: l.order ?? 0, fallback: i + normalizedMeta.length })),
  ]
  const hasAnyOrder = resources.some(r => r.order > 0)
  const sorted = resources.slice().sort((a, b) => {
    const ao = a.order > 0 ? a.order : (hasAnyOrder ? Number.MAX_SAFE_INTEGER : a.fallback)
    const bo = b.order > 0 ? b.order : (hasAnyOrder ? Number.MAX_SAFE_INTEGER : b.fallback)
    if (ao !== bo) return ao - bo
    return a.fallback - b.fallback
  })

  sorted.forEach((r, idx) => {
    const order = idx + 1
    if (r.kind === "attachment") normalizedMeta[r.index] = { ...normalizedMeta[r.index], order }
    else youtubeLinks[r.index] = { ...youtubeLinks[r.index], order }
  })

  return { ...lesson, attachmentsMeta: normalizedMeta, youtubeLinks }
}

const buildLessonResources = (lesson: AdminLesson): LessonResource[] => {
  const attachmentsMeta = lesson.attachmentsMeta ?? []
  const youtubeLinks = lesson.youtubeLinks ?? []
  const attachmentResources = attachmentsMeta.map((meta, index) => ({
    kind: "attachment" as const,
    index,
    order: meta.order ?? index + 1,
    title: meta.title ?? meta.name ?? `Fichier ${index + 1}`,
    description: meta.description ?? "",
    name: meta.name,
  }))
  const youtubeResources = youtubeLinks.map((link, index) => ({
    kind: "youtube" as const,
    index,
    order: link.order ?? attachmentsMeta.length + index + 1,
    title: link.title ?? link.description ?? `Vidéo ${index + 1}`,
    description: link.description ?? "",
    url: link.url ?? "",
  }))
  return [...attachmentResources, ...youtubeResources].sort((a, b) => a.order - b.order)
}

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return m ? m[1] : null
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>
      {children}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
    </label>
  )
}

function Input({ value, onChange, placeholder, type = "text", step, min, max, style }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string
  type?: string; step?: string; min?: string; max?: string; style?: React.CSSProperties
}) {
  return (
    <input type={type} step={step} min={min} max={max} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...style }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; e.target.style.background = "#fff" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc" }}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; e.target.style.background = "#fff" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc" }}
    />
  )
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", appearance: "none", cursor: "pointer", fontFamily: "inherit" }}
        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" }}
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

// ─── File Upload Zone ─────────────────────────────────────────────────────────

function FileUploadZone({ onFiles, existingMeta, onDescriptionChange }: {
  onFiles: (files: File[], meta: AttachmentMeta[]) => void
  existingMeta?: AttachmentMeta[]
  onDescriptionChange?: (idx: number, desc: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf" || f.name.match(/\.(doc|docx)$/i))
    if (files.length) onFiles(files, files.map(f => ({ name: f.name, description: "" })))
  }

  const extColor = (name: string) => name.endsWith(".pdf") ? { bg: "rgba(239,68,68,0.08)", text: "#ef4444" } : { bg: "rgba(59,130,246,0.08)", text: "#3b82f6" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent,#6366f1)" : "#e2e8f0"}`,
          borderRadius: 12, background: dragging ? "rgba(99,102,241,0.04)" : "#fafbfd",
          padding: "18px 12px", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent,#6366f1)" }}
        onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0" }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Upload style={{ width: 16, height: 16, color: "var(--accent,#6366f1)" }} />
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#475569", margin: 0, textAlign: "center" }}>
          Glisser ou <span style={{ color: "var(--accent,#6366f1)" }}>parcourir</span>
        </p>
        <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>PDF · DOC · DOCX</p>
        <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx" style={{ display: "none" }}
          onChange={e => {
            const files = Array.from(e.target.files || [])
            if (files.length) onFiles(files, files.map(f => ({ name: f.name, description: "" })))
            e.target.value = ""
          }}
        />
      </div>

      {/* File chips */}
      {(existingMeta ?? []).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {existingMeta?.map((meta, idx) => {
            const { bg, text } = extColor(meta.name)
            const ext = meta.name.split(".").pop()?.toUpperCase() ?? "FILE"
            return (
              <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e8ecf3", borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText style={{ width: 13, height: 13, color: text }} />
                  </div>
                  <p style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.name}</p>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", padding: "2px 6px", borderRadius: 5, background: bg, color: text, textTransform: "uppercase" }}>{ext}</span>
                </div>
                {onDescriptionChange && (
                  <input type="text" placeholder="Description du fichier…" value={meta.description || ""}
                    onChange={e => onDescriptionChange(idx, e.target.value)}
                    style={{ width: "100%", fontSize: 11, padding: "5px 9px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", boxSizing: "border-box", color: "#475569" }}
                    onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)" }}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0" }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── YouTube Manager ──────────────────────────────────────────────────────────

function YoutubeManager({ links, onChange }: { links: YoutubeLinkItem[]; onChange: (links: YoutubeLinkItem[]) => void }) {
  const addLink = () => onChange([...links, { url: "", description: "" }])
  const removeLink = (idx: number) => onChange(links.filter((_, i) => i !== idx))
  const update = (idx: number, field: "url" | "description", val: string) => {
    const next = [...links]; next[idx] = { ...next[idx], [field]: val }; onChange(next)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {links.map((link, idx) => {
        const ytId = getYoutubeId(link.url)
        return (
          <div key={idx} style={{ border: "1px solid #e8ecf3", borderRadius: 10, overflow: "hidden", background: "#fafbfd" }}>
            <div style={{ display: "flex" }}>
              {/* Thumbnail */}
              <div style={{ width: 80, flexShrink: 0, background: ytId ? "none" : "linear-gradient(135deg,#1a1a2e,#2d1b4e)", position: "relative", overflow: "hidden", minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ytId ? (
                  <>
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "4px 0 4px 7px", borderColor: "transparent transparent transparent #fff", marginLeft: 2 }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <Film style={{ width: 20, height: 20, color: "rgba(99,102,241,0.5)" }} />
                )}
              </div>
              {/* Fields */}
              <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Youtube style={{ width: 12, height: 12, color: "#ff0000", flexShrink: 0 }} />
                  <input type="url" placeholder="URL YouTube…" value={link.url} onChange={e => update(idx, "url", e.target.value)}
                    style={{ flex: 1, fontSize: 11, padding: "4px 8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", color: "#0f172a" }}
                    onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)" }}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0" }}
                  />
                  <button onClick={() => removeLink(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "#94a3b8", display: "flex", borderRadius: 5, transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#f43f5e"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <input type="text" placeholder="Description (optionnelle)" value={link.description || ""} onChange={e => update(idx, "description", e.target.value)}
                  style={{ fontSize: 11, padding: "4px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", color: "#64748b" }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.background = "#fff" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                />
              </div>
            </div>
          </div>
        )
      })}

      <button onClick={addLink}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 10, border: "1.5px dashed #e2e8f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
      >
        <Youtube style={{ width: 12, height: 12, color: "#ff0000" }} /> Ajouter un lien YouTube
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CoursesCrud({ initialCourses = [], onSave, onDelete, onView }: CoursesCrudProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())

  const showToast = (type: ToastType, message: string, duration = 4500) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    setToasts(prev => [...prev, { id, type, message, duration, createdAt: Date.now() }])
    if (type !== "loading") setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    return id
  }
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  useEffect(() => {
    const iv = setInterval(() => { const now = Date.now(); setToasts(prev => prev.filter(t => t.type === "loading" || now - t.createdAt < t.duration)) }, 100)
    return () => clearInterval(iv)
  }, [])
  useEffect(() => { if (initialCourses.length) setCourses(initialCourses) }, [initialCourses])
  useEffect(() => { return () => { if (editingCourse?.coverPreview?.startsWith("blob:")) URL.revokeObjectURL(editingCourse.coverPreview) } }, [editingCourse?.coverPreview])

  const createBlankCourse = (): AdminCourse => ({ title: "", shortDescription: "", longDescription: "", durationLabel: "", prerequis: "Aucun", certificate: true, certifications: [], rating: 4.8, reviewsCount: 0, whatYouWillLearn: [""], tags: [], modules: [], coverImage: null, coverPreview: null })

  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleSelectCourse = (course: AdminCourse) => {
    const normalizedModules = (course.modules ?? []).map(m => ({
      ...m,
      locked: m.locked ?? false,
      lessons: (m.lessons ?? []).map(l => normalizeLessonResources({
        ...l,
        locked: l.locked ?? false,
        attachments: l.attachments ?? [],
        attachmentsMeta: l.attachmentsMeta ?? [],
        youtubeLinks: l.youtubeLinks ?? [],
      })),
    }))
    setEditingCourse({ ...JSON.parse(JSON.stringify(course)), modules: normalizedModules, coverPreview: typeof course.coverImage === "string" ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/courses/${course.id}/${course.coverImage}` : null, coverImage: null })
    setIsCreating(false); setExpandedModules(new Set())
  }
  const handleNewCourse = () => { setEditingCourse(createBlankCourse()); setIsCreating(true); setExpandedModules(new Set()) }
  const handleCancelEdit = () => { setEditingCourse(null); setIsCreating(false) }

  const handleSaveCourse = async () => {
    if (!editingCourse) return
    if (!editingCourse.title.trim()) { showToast("error", "Le titre est obligatoire"); return }
    setLoading(true); const lid = showToast("loading", "Enregistrement en cours…")
    try {
      if (onSave) await onSave(editingCourse)
      if (editingCourse.id) { setCourses(prev => prev.map(c => c.id === editingCourse.id ? { ...editingCourse, coverImage: c.coverImage } : c)) }
      else { const nc = { ...editingCourse, id: `course_${Date.now()}` }; setCourses(prev => [...prev, nc]); setEditingCourse(nc); setIsCreating(false) }
      removeToast(lid); showToast("success", "Formation enregistrée avec succès !")
    } catch (err: any) { removeToast(lid); showToast("error", err.message || "Erreur lors de l'enregistrement") }
    finally { setLoading(false) }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Supprimer cette formation ? Cette action est irréversible.")) return
    try {
      if (onDelete) await onDelete(id)
      setCourses(prev => prev.filter(c => c.id !== id))
      if (editingCourse?.id === id) setEditingCourse(null)
      showToast("success", "Formation supprimée.")
    } catch (err: any) { showToast("error", err.message || "Erreur lors de la suppression") }
  }

  const handleAddModule = () => {
    if (!editingCourse) return
    const newIdx = (editingCourse.modules ?? []).length
    setEditingCourse({ ...editingCourse, modules: [...(editingCourse.modules ?? []), { title: "Nouveau module", durationLabel: "", order: newIdx + 1, locked: false, lessons: [] }] })
    setExpandedModules(prev => new Set([...prev, newIdx]))
  }
  const handleRemoveModule = (i: number) => editingCourse && setEditingCourse({ ...editingCourse, modules: editingCourse.modules.filter((_, j) => j !== i) })
  const handleMoveModule = (index: number, dir: "up" | "down") => {
    if (!editingCourse) return
    const modules = [...editingCourse.modules]; const target = dir === "up" ? index - 1 : index + 1
    if (target < 0 || target >= modules.length) return
    const [item] = modules.splice(index, 1); modules.splice(target, 0, item)
    setEditingCourse({ ...editingCourse, modules: normalizeModulesOrder(modules) })
  }
  const handleModuleChange = (index: number, field: string, value: string | boolean) => {
    if (!editingCourse) return
    const modules = [...(editingCourse.modules ?? [])]
    modules[index] = { ...modules[index], [field]: value, lessons: modules[index].lessons ?? [] }
    setEditingCourse({ ...editingCourse, modules })
  }
  const handleAddLesson = (mi: number) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.map((m, i) => i === mi ? { ...m, lessons: [...m.lessons, { title: "Nouvelle leçon", durationLabel: "", order: m.lessons.length + 1, locked: false, attachments: [], attachmentsMeta: [], youtubeLinks: [] }] } : m)
    setEditingCourse({ ...editingCourse, modules })
  }
  const handleRemoveLesson = (mi: number, li: number) => {
    if (!editingCourse) return
    const modules = [...editingCourse.modules]; modules[mi].lessons = modules[mi].lessons.filter((_, i) => i !== li)
    setEditingCourse({ ...editingCourse, modules })
  }
  const handleMoveLesson = (mi: number, li: number, dir: "up" | "down") => {
    if (!editingCourse) return
    const modules = editingCourse.modules.map((module, i) => {
      if (i !== mi) return module
      const lessons = [...module.lessons]; const target = dir === "up" ? li - 1 : li + 1
      if (target < 0 || target >= lessons.length) return module
      const [item] = lessons.splice(li, 1); lessons.splice(target, 0, item)
      return { ...module, lessons: lessons.map((l, idx) => ({ ...l, order: idx + 1 })) }
    })
    setEditingCourse({ ...editingCourse, modules: normalizeModulesOrder(modules) })
  }
  const handleLessonChange = (mi: number, li: number, field: string, value: string | boolean) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.map((module, i) => i !== mi ? module : { ...module, lessons: module.lessons.map((lesson, j) => j === li ? { ...lesson, [field]: value } : lesson) })
    setEditingCourse({ ...editingCourse, modules })
  }

  const updateLessonAt = (mi: number, li: number, updater: (lesson: AdminLesson) => AdminLesson) => {
    if (!editingCourse) return
    const modules = editingCourse.modules.map((m, i) => {
      if (i !== mi) return m
      return {
        ...m,
        lessons: m.lessons.map((l, j) => j !== li ? l : normalizeLessonResources(updater(l))),
      }
    })
    setEditingCourse({ ...editingCourse, modules })
  }

  const getNextLessonResourceOrder = (lesson: AdminLesson) => {
    const resources = buildLessonResources(normalizeLessonResources(lesson))
    const maxOrder = resources.reduce((max, r) => Math.max(max, r.order), 0)
    return maxOrder + 1
  }

  const addLessonAttachments = (mi: number, li: number, files: File[]) => {
    if (files.length === 0) return
    updateLessonAt(mi, li, lesson => {
      const nextAttachments = [...(lesson.attachments ?? []), ...files]
      const nextMeta = [...(lesson.attachmentsMeta ?? [])]
      let nextOrder = getNextLessonResourceOrder(lesson)
      for (const file of files) {
        nextMeta.push({
          name: file.name,
          title: stripFileExtension(file.name),
          description: "",
          order: nextOrder++,
        })
      }
      return { ...lesson, attachments: nextAttachments, attachmentsMeta: nextMeta }
    })
  }

  const addLessonYoutube = (mi: number, li: number) => {
    updateLessonAt(mi, li, lesson => {
      const nextOrder = getNextLessonResourceOrder(lesson)
      const nextLinks = [...(lesson.youtubeLinks ?? []), { url: "", title: "", description: "", order: nextOrder }]
      return { ...lesson, youtubeLinks: nextLinks }
    })
  }

  const updateLessonAttachmentMeta = (mi: number, li: number, idx: number, field: "title" | "description", value: string) => {
    updateLessonAt(mi, li, lesson => {
      const nextMeta = [...(lesson.attachmentsMeta ?? [])]
      nextMeta[idx] = { ...nextMeta[idx], [field]: value }
      return { ...lesson, attachmentsMeta: nextMeta }
    })
  }

  const updateLessonYoutubeMeta = (mi: number, li: number, idx: number, field: "title" | "description" | "url", value: string) => {
    updateLessonAt(mi, li, lesson => {
      const nextLinks = [...(lesson.youtubeLinks ?? [])]
      nextLinks[idx] = { ...nextLinks[idx], [field]: value }
      return { ...lesson, youtubeLinks: nextLinks }
    })
  }

  const removeLessonResource = (mi: number, li: number, kind: "attachment" | "youtube", idx: number) => {
    updateLessonAt(mi, li, lesson => {
      if (kind === "attachment") {
        const nextAttachments = (lesson.attachments ?? []).filter((_, i) => i !== idx)
        const nextMeta = (lesson.attachmentsMeta ?? []).filter((_, i) => i !== idx)
        return { ...lesson, attachments: nextAttachments, attachmentsMeta: nextMeta }
      }
      const nextLinks = (lesson.youtubeLinks ?? []).filter((_, i) => i !== idx)
      return { ...lesson, youtubeLinks: nextLinks }
    })
  }

  const moveLessonResource = (mi: number, li: number, currentIndex: number, dir: "up" | "down") => {
    updateLessonAt(mi, li, lesson => {
      const resources = buildLessonResources(lesson)
      const target = dir === "up" ? currentIndex - 1 : currentIndex + 1
      if (target < 0 || target >= resources.length) return lesson
      const reordered = [...resources]
      const [item] = reordered.splice(currentIndex, 1)
      reordered.splice(target, 0, item)

      const nextMeta = [...(lesson.attachmentsMeta ?? [])]
      const nextLinks = [...(lesson.youtubeLinks ?? [])]
      reordered.forEach((r, idx) => {
        const order = idx + 1
        if (r.kind === "attachment") nextMeta[r.index] = { ...nextMeta[r.index], order }
        else nextLinks[r.index] = { ...nextLinks[r.index], order }
      })
      return { ...lesson, attachmentsMeta: nextMeta, youtubeLinks: nextLinks }
    })
  }

  const handleAddWhatItem = () => editingCourse && setEditingCourse({ ...editingCourse, whatYouWillLearn: [...editingCourse.whatYouWillLearn, ""] })
  const handleUpdateWhatItem = (i: number, v: string) => { if (!editingCourse) return; const items = [...editingCourse.whatYouWillLearn]; items[i] = v; setEditingCourse({ ...editingCourse, whatYouWillLearn: items }) }
  const handleRemoveWhatItem = (i: number) => editingCourse && setEditingCourse({ ...editingCourse, whatYouWillLearn: editingCourse.whatYouWillLearn.filter((_, j) => j !== i) })
  const handleAddTag = () => editingCourse && setEditingCourse({ ...editingCourse, tags: [...editingCourse.tags, ""] })
  const handleUpdateTag = (i: number, v: string) => { if (!editingCourse) return; const tags = [...editingCourse.tags]; tags[i] = v; setEditingCourse({ ...editingCourse, tags }) }
  const handleRemoveTag = (i: number) => editingCourse && setEditingCourse({ ...editingCourse, tags: editingCourse.tags.filter((_, j) => j !== i) })

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100vh", display: "flex", background: "#f0f2f8", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>

      {/* ════ SIDEBAR — 420px ════ */}
      <div style={{ width: 420, minWidth: 420, background: "#fff", borderRight: "1px solid #e8ecf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 22px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 2 }}>Catalogue</p>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Formations</h1>
            </div>
            <div style={{ background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", borderRadius: 12, padding: "6px 16px", fontSize: 22, fontWeight: 800 }}>{courses.length}</div>
          </div>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8" }} />
            <input type="text" placeholder="Rechercher une formation…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
              onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
            />
          </div>
        </div>

        {/* New button */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <button onClick={handleNewCourse}
            style={{ width: "100%", padding: "10px 16px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)", transition: "opacity 0.15s,transform 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "none" }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Nouvelle formation
          </button>
        </div>

        {/* Course list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {filteredCourses.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <BookOpen style={{ width: 40, height: 40, color: "#cbd5e1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Aucune formation trouvée</p>
            </div>
          ) : filteredCourses.map(course => {
            const isActive = editingCourse?.id === course.id
            return (
              <div key={course.id} onClick={() => handleSelectCourse(course)}
                style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 4, background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(129,140,248,0.05))" : "transparent", border: isActive ? "1.5px solid rgba(99,102,241,0.2)" : "1.5px solid transparent", transition: "all 0.15s", position: "relative" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
              >
                {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 28, background: "var(--accent,#6366f1)", borderRadius: "0 3px 3px 0" }} />}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent,#6366f1)" : "#0f172a", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {course.title || "Sans titre"}
                    </p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.shortDescription}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 7 }}>
                      <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}><Layers style={{ width: 11, height: 11 }} />{course.modules?.length || 0} modules</span>
                      <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}><Star style={{ width: 11, height: 11, fill: "#f59e0b", color: "#f59e0b" }} />{course.rating.toFixed(1)}</span>
                      {course.durationLabel && <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}><Clock style={{ width: 11, height: 11 }} />{course.durationLabel}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {onView && <IconBtn onClick={e => { e.stopPropagation(); course.id && onView(course.id) }} color="#64748b"><Eye style={{ width: 13, height: 13 }} /></IconBtn>}
                    <IconBtn onClick={e => { e.stopPropagation(); handleSelectCourse(course) }} color="var(--accent,#6366f1)" hoverBg="rgba(99,102,241,0.08)"><Edit style={{ width: 13, height: 13 }} /></IconBtn>
                    <IconBtn onClick={e => { e.stopPropagation(); course.id && handleDeleteCourse(course.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ════ RIGHT PANEL ════ */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {editingCourse ? (
          <>
            {/* Top bar */}
            <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf3", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>{isCreating ? "Nouvelle formation" : "Modifier la formation"}</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>{editingCourse.title || "Sans titre"}</h2>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCancelEdit}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#f43f5e"; (e.currentTarget as HTMLButtonElement).style.color = "#f43f5e" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b" }}
                >
                  <X style={{ width: 14, height: 14 }} /> Annuler
                </button>
                <button onClick={handleSaveCourse} disabled={loading}
                  style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: loading ? "#e2e8f0" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.3)" }}
                >
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                  {loading ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>

            {/* Scrollable form */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

                {/* ── Cover 16:9 ── */}
                <div style={{ position: "relative" }}>
                  <div
                    onClick={() => document.getElementById("coverInput")?.click()}
                    style={{ width: "100%", paddingTop: "56.25%", position: "relative", borderRadius: 18, border: "2px dashed #e2e8f0", background: editingCourse.coverPreview ? "none" : "linear-gradient(135deg,#f8fafc,#eef2ff)", cursor: "pointer", overflow: "hidden", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent,#6366f1)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0"}
                  >
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {editingCourse.coverPreview ? (
                        <>
                          <img src={editingCourse.coverPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0, transition: "opacity 0.2s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "0"}
                          >
                            <ImagePlus style={{ width: 28, height: 28, color: "#fff" }} />
                            <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>Changer l'image</p>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                            <ImagePlus style={{ width: 28, height: 28, color: "var(--accent,#6366f1)" }} />
                          </div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: 0 }}>Ajouter une image de couverture</p>
                          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>Format 16:9 · Résolution recommandée 1920 × 1080</p>
                        </div>
                      )}
                    </div>
                    <input id="coverInput" type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                      onChange={e => { const file = e.target.files?.[0]; if (!file) return; setEditingCourse({ ...editingCourse, coverImage: file, coverPreview: URL.createObjectURL(file) }) }}
                    />
                  </div>
                  {/* 16:9 badge */}
                  <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: 7, backdropFilter: "blur(4px)" }}>
                    16 : 9
                  </div>
                </div>

                {/* ── Informations ── */}
                <FormCard title="Informations générales" icon={<BookOpen style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <FieldLabel required>Titre de la formation</FieldLabel>
                      <Input value={editingCourse.title} onChange={v => setEditingCourse({ ...editingCourse, title: v })} placeholder="Ex : Développement Web avec React" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <FieldLabel required>Prérequis</FieldLabel>
                        <SelectField value={editingCourse.prerequis} onChange={v => setEditingCourse({ ...editingCourse, prerequis: v as any })}>
                          <option value="Aucun">Aucun</option>
                          <option value="Contacter l'administration">Contacter l'administration</option>
                        </SelectField>
                      </div>
                      <div>
                        <FieldLabel required>Durée</FieldLabel>
                        <Input value={editingCourse.durationLabel} onChange={v => setEditingCourse({ ...editingCourse, durationLabel: v })} placeholder="Ex : 40 heures" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel required>Description courte</FieldLabel>
                      <Textarea value={editingCourse.shortDescription} onChange={v => setEditingCourse({ ...editingCourse, shortDescription: v })} placeholder="Une brève présentation de la formation…" rows={2} />
                    </div>
                    <div>
                      <FieldLabel>Description détaillée</FieldLabel>
                      <Textarea value={editingCourse.longDescription} onChange={v => setEditingCourse({ ...editingCourse, longDescription: v })} placeholder="Décrivez en détail les objectifs, le programme…" rows={5} />
                    </div>
                  </div>
                </FormCard>

                {/* ── Objectifs ── */}
                <FormCard title="Ce que vous apprendrez" icon={<Award style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {editingCourse.whatYouWillLearn.map((item, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.08))", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{index + 1}</div>
                        <input type="text" value={item} onChange={e => handleUpdateWhatItem(index, e.target.value)} placeholder="Ex : Maîtriser les bases de JavaScript"
                          style={{ flex: 1, padding: "9px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                          onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.background = "#fff" }}
                          onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                        />
                        <IconBtn onClick={() => handleRemoveWhatItem(index)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                      </div>
                    ))}
                    <button onClick={handleAddWhatItem}
                      style={{ marginTop: 4, padding: "10px", borderRadius: 10, border: "1.5px dashed #e2e8f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                    >+ Ajouter un objectif</button>
                  </div>
                </FormCard>

                {/* ── Tags ── */}
                <FormCard title="Tags" icon={<Tag style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {editingCourse.tags.map((tag, index) => (
                      <div key={index} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(129,140,248,0.06))", border: "1px solid rgba(99,102,241,0.2)", color: "var(--accent,#6366f1)", padding: "5px 12px", borderRadius: 20 }}>
                        <input value={tag} onChange={e => handleUpdateTag(index, e.target.value)} placeholder="Tag" style={{ background: "transparent", border: "none", outline: "none", minWidth: 60, fontSize: 12, fontWeight: 600, color: "inherit", fontFamily: "inherit" }} />
                        <button onClick={() => handleRemoveTag(index)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", opacity: 0.7, display: "flex" }}><X style={{ width: 11, height: 11 }} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleAddTag}
                    style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px dashed #e2e8f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                  >+ Ajouter un tag</button>
                </FormCard>

                {/* ── Stats & Certificat ── */}
                <FormCard title="Statistiques & certificat" icon={<Star style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <FieldLabel>Note</FieldLabel>
                        <div style={{ position: "relative" }}>
                          <Star style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, fill: "#f59e0b", color: "#f59e0b" }} />
                          <input type="number" step="0.1" min="0" max="5" value={editingCourse.rating} onChange={e => setEditingCourse({ ...editingCourse, rating: parseFloat(e.target.value) || 0 })}
                            style={{ width: "100%", padding: "10px 14px 10px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box" }}
                            onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.background = "#fff" }}
                            onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Nombre d'avis</FieldLabel>
                        <Input value={editingCourse.reviewsCount} onChange={v => setEditingCourse({ ...editingCourse, reviewsCount: parseInt(v) || 0 })} type="number" />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: editingCourse.certificate ? "linear-gradient(135deg,rgba(34,197,94,0.06),rgba(16,185,129,0.04))" : "#f8fafc", border: `1.5px solid ${editingCourse.certificate ? "rgba(34,197,94,0.2)" : "#e2e8f0"}`, transition: "all 0.2s" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>Certificat inclus</p>
                        <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{editingCourse.certificate ? "Les apprenants reçoivent un certificat" : "Aucun certificat pour cette formation"}</p>
                      </div>
                      <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                        <input type="checkbox" checked={editingCourse.certificate} onChange={e => setEditingCourse({ ...editingCourse, certificate: e.target.checked })} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                        <div style={{ width: 48, height: 26, borderRadius: 13, background: editingCourse.certificate ? "#22c55e" : "#e2e8f0", transition: "background 0.2s", position: "relative" }}>
                          <div style={{ position: "absolute", top: 3, left: editingCourse.certificate ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", transition: "left 0.2s" }} />
                        </div>
                      </label>
                    </div>
                    {editingCourse.certificate && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {editingCourse.certifications.map((cert, index) => (
                          <div key={index} style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: "#fafbfd" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em" }}>CERTIFICATION {index + 1}</span>
                              <IconBtn onClick={() => setEditingCourse({ ...editingCourse, certifications: editingCourse.certifications.filter((_, i) => i !== index) })} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <FieldLabel>Nom du certificat</FieldLabel>
                                <input type="text" value={cert.title} onChange={e => { const c = [...editingCourse.certifications]; c[index].title = e.target.value; setEditingCourse({ ...editingCourse, certifications: c }) }}
                                  style={{ width: "100%", padding: "9px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                                  onFocus={e => e.target.style.borderColor = "var(--accent,#6366f1)"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                />
                              </div>
                              <div>
                                <FieldLabel>Institut / Organisme</FieldLabel>
                                <input type="text" value={cert.issuer || ""} onChange={e => { const c = [...editingCourse.certifications]; c[index].issuer = e.target.value; setEditingCourse({ ...editingCourse, certifications: c }) }}
                                  style={{ width: "100%", padding: "9px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                                  onFocus={e => e.target.style.borderColor = "var(--accent,#6366f1)"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setEditingCourse({ ...editingCourse, certifications: [...editingCourse.certifications, { title: "" }] })}
                          style={{ padding: "10px", borderRadius: 10, border: "1.5px dashed #e2e8f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                        >+ Ajouter une certification</button>
                      </div>
                    )}
                  </div>
                </FormCard>

                {/* ── Modules ── */}
                <FormCard title="Modules & Leçons" icon={<Layers style={{ width: 16, height: 16 }} />}
                  action={
                    <button onClick={handleAddModule} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)", color: "var(--accent,#6366f1)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <Plus style={{ width: 12, height: 12 }} /> Ajouter un module
                    </button>
                  }
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(editingCourse.modules ?? []).map((module, mi) => {
                      const isExpanded = expandedModules.has(mi)
                      return (
                        <div key={mi} style={{ border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#fafbfd" }}>
                          {/* Module header */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderBottom: isExpanded ? "1px solid #f1f5f9" : "none", cursor: "pointer" }}
                            onClick={() => { const next = new Set(expandedModules); isExpanded ? next.delete(mi) : next.add(mi); setExpandedModules(next) }}
                          >
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{mi + 1}</div>
                            <input type="text" value={module.title} onChange={e => { e.stopPropagation(); handleModuleChange(mi, "title", e.target.value) }} onClick={e => e.stopPropagation()} placeholder="Nom du module"
                              style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#0f172a", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }} />
                            <input type="text" value={module.durationLabel} onChange={e => { e.stopPropagation(); handleModuleChange(mi, "durationLabel", e.target.value) }} onClick={e => e.stopPropagation()} placeholder="Durée"
                              style={{ width: 80, padding: "5px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#64748b", outline: "none", fontFamily: "inherit" }} />
                            <label onClick={e => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b", fontWeight: 600, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: 8 }}>
                              <input
                                type="checkbox"
                                checked={!!module.locked}
                                onChange={e => handleModuleChange(mi, "locked", e.target.checked)}
                                style={{ width: 14, height: 14 }}
                              />
                              Verrouillé
                            </label>
                            <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{module.lessons.length} leçon{module.lessons.length !== 1 ? "s" : ""}</span>
                            <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
                              <IconBtn onClick={() => handleMoveModule(mi, "up")} color="#64748b"><ChevronUp style={{ width: 13, height: 13 }} /></IconBtn>
                              <IconBtn onClick={() => handleMoveModule(mi, "down")} color="#64748b"><ChevronDown style={{ width: 13, height: 13 }} /></IconBtn>
                              <IconBtn onClick={() => handleRemoveModule(mi)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                            </div>
                            <ChevronRight style={{ width: 16, height: 16, color: "#94a3b8", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                          </div>

                          {isExpanded && (
                            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                              {module.lessons.map((lesson, li) => (
                                <div key={li} style={{ background: "#fff", border: "1px solid #e8ecf3", borderRadius: 12, padding: "14px" }}>
                                  {/* Lesson title row */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                    <span style={{ fontSize: 11, color: "#94a3b8", width: 20, textAlign: "center", flexShrink: 0 }}>{li + 1}</span>
                                    <input type="text" value={lesson.title} onChange={e => handleLessonChange(mi, li, "title", e.target.value)} placeholder="Titre de la leçon"
                                      style={{ flex: 1, padding: "7px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                                      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.background = "#fff" }}
                                      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                                    />
                                    <input type="text" value={lesson.durationLabel} onChange={e => handleLessonChange(mi, li, "durationLabel", e.target.value)} placeholder="Durée"
                                      style={{ width: 72, padding: "7px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#64748b", outline: "none", fontFamily: "inherit" }} />
                                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b", fontWeight: 600, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: 8 }}>
                                      <input
                                        type="checkbox"
                                        checked={!!lesson.locked}
                                        onChange={e => handleLessonChange(mi, li, "locked", e.target.checked)}
                                        style={{ width: 14, height: 14 }}
                                      />
                                      Verrouillé
                                    </label>
                                    <div style={{ display: "flex", gap: 1 }}>
                                      <IconBtn onClick={() => handleMoveLesson(mi, li, "up")} color="#64748b"><ChevronUp style={{ width: 12, height: 12 }} /></IconBtn>
                                      <IconBtn onClick={() => handleMoveLesson(mi, li, "down")} color="#64748b"><ChevronDown style={{ width: 12, height: 12 }} /></IconBtn>
                                      <IconBtn onClick={() => handleRemoveLesson(mi, li)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 12, height: 12 }} /></IconBtn>
                                    </div>
                                  </div>

                                  {/* Resources (global order) */}
                                  <div style={{ paddingLeft: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                          <Paperclip style={{ width: 11, height: 11, color: "var(--accent,#6366f1)" }} />
                                        </div>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>Ressources (ordre global)</p>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <label htmlFor={`lesson-files-${mi}-${li}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: "1.5px dashed #e2e8f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                          <Upload style={{ width: 12, height: 12 }} /> Ajouter un fichier
                                        </label>
                                        <input
                                          id={`lesson-files-${mi}-${li}`}
                                          type="file"
                                          multiple
                                          accept=".pdf,.doc,.docx"
                                          style={{ display: "none" }}
                                          onChange={e => {
                                            const files = Array.from(e.target.files || [])
                                            if (files.length) addLessonAttachments(mi, li, files)
                                            e.currentTarget.value = ""
                                          }}
                                        />
                                        <button
                                          onClick={() => addLessonYoutube(mi, li)}
                                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: "1.5px dashed rgba(255,0,0,0.3)", background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                        >
                                          <Youtube style={{ width: 12, height: 12 }} /> Ajouter YouTube
                                        </button>
                                      </div>
                                    </div>

                                    {buildLessonResources(lesson).length === 0 ? (
                                      <div style={{ padding: "16px", borderRadius: 10, border: "1px dashed #e2e8f0", background: "#f8fafc", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                                        Aucune ressource pour cette leçon.
                                      </div>
                                    ) : (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {buildLessonResources(lesson).map((res, ri) => {
                                          const isYoutube = res.kind === "youtube"
                                          const ytId = isYoutube ? getYoutubeId(res.url || "") : null
                                          return (
                                            <div key={`${res.kind}-${res.index}`} style={{ border: "1px solid #e8ecf3", borderRadius: 12, background: "#fff", padding: "10px 12px" }}>
                                              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                                <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                                  {res.order}
                                                </div>
                                                <div style={{ width: 58, height: 42, borderRadius: 8, background: isYoutube ? "#0f172a" : "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                                                  {isYoutube ? (
                                                    ytId ? (
                                                      <>
                                                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                            <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "3px 0 3px 5px", borderColor: "transparent transparent transparent #fff", marginLeft: 1 }} />
                                                          </div>
                                                        </div>
                                                      </>
                                                    ) : (
                                                      <Film style={{ width: 18, height: 18, color: "rgba(255,255,255,0.6)" }} />
                                                    )
                                                  ) : (
                                                    <FileText style={{ width: 16, height: 16, color: "var(--accent,#6366f1)" }} />
                                                  )}
                                                </div>

                                                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                                  <input
                                                    type="text"
                                                    placeholder={isYoutube ? "Titre de la vidéo" : "Titre du fichier"}
                                                    value={res.title}
                                                    onChange={e => {
                                                      if (isYoutube) updateLessonYoutubeMeta(mi, li, res.index, "title", e.target.value)
                                                      else updateLessonAttachmentMeta(mi, li, res.index, "title", e.target.value)
                                                    }}
                                                    style={{ width: "100%", fontSize: 12, padding: "6px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", color: "#0f172a" }}
                                                    onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.background = "#fff" }}
                                                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                                                  />
                                                  {isYoutube ? (
                                                    <input
                                                      type="url"
                                                      placeholder="URL YouTubeâ€¦"
                                                      value={res.url || ""}
                                                      onChange={e => updateLessonYoutubeMeta(mi, li, res.index, "url", e.target.value)}
                                                      style={{ width: "100%", fontSize: 11, padding: "5px 8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", color: "#0f172a" }}
                                                      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)" }}
                                                      onBlur={e => { e.target.style.borderColor = "#e2e8f0" }}
                                                    />
                                                  ) : (
                                                    <div style={{ fontSize: 11, color: "#64748b", padding: "2px 2px" }}>
                                                      {res.name || "Fichier joint"}
                                                    </div>
                                                  )}
                                                  <input
                                                    type="text"
                                                    placeholder="Description (optionnelle)"
                                                    value={res.description || ""}
                                                    onChange={e => {
                                                      if (isYoutube) updateLessonYoutubeMeta(mi, li, res.index, "description", e.target.value)
                                                      else updateLessonAttachmentMeta(mi, li, res.index, "description", e.target.value)
                                                    }}
                                                    style={{ width: "100%", fontSize: 11, padding: "5px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, outline: "none", color: "#64748b" }}
                                                    onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.background = "#fff" }}
                                                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                                                  />
                                                </div>

                                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                  <IconBtn onClick={() => moveLessonResource(mi, li, ri, "up")} color="#64748b"><ChevronUp style={{ width: 12, height: 12 }} /></IconBtn>
                                                  <IconBtn onClick={() => moveLessonResource(mi, li, ri, "down")} color="#64748b"><ChevronDown style={{ width: 12, height: 12 }} /></IconBtn>
                                                  <IconBtn onClick={() => removeLessonResource(mi, li, res.kind, res.index)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 12, height: 12 }} /></IconBtn>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              <button onClick={() => handleAddLesson(mi)}
                                style={{ padding: "9px", borderRadius: 10, border: "1.5px dashed #e2e8f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                              >+ Ajouter une leçon</button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {(editingCourse.modules ?? []).length === 0 && (
                      <div style={{ padding: "32px", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1.5px dashed #e2e8f0" }}>
                        <Layers style={{ width: 32, height: 32, color: "#cbd5e1", margin: "0 auto 10px" }} />
                        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Aucun module. Commencez par en ajouter un.</p>
                      </div>
                    )}
                  </div>
                </FormCard>

                <div style={{ height: 32 }} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen style={{ width: 36, height: 36, color: "var(--accent,#6366f1)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Aucune formation sélectionnée</h3>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Choisissez une formation dans la liste ou créez-en une nouvelle.</p>
            </div>
            <button onClick={handleNewCourse} style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
              <Plus style={{ width: 16, height: 16 }} /> Créer une formation
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
