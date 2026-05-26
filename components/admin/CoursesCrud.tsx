"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Edit, Trash2, ExternalLink,
  ChevronUp, ChevronDown, Save, X,
  BookOpen, Star,
  CheckCircle, AlertCircle, Loader2,
  Layers, Clock, Award, Tag, Video, Paperclip, ChevronRight,
  Upload, FileText, Youtube, ImagePlus, Film,
  Archive
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "loading"
type Toast = { id: string; type: ToastType; message: string; duration: number; createdAt: number }

type AdminLesson = {
  id?: string; title: string; durationLabel: string; order?: number
  locked?: boolean
  attachments?: File[]; attachmentsMeta?: AttachmentMeta[]; youtubeLinks?: YoutubeLinkItem[]
}
type AdminModule = { id?: string; title: string; durationLabel: string; order?: number; locked?: boolean; lessons: AdminLesson[] }
type CertificationItem = {
  id?: string
  title: string
  issuer?: string
  description?: string
  image?: string
  imageUrl?: string | null
  imageFile?: File | null
  imagePreview?: string | null
}
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
  slug?: string
  durationLabel: string; prerequis: "Aucun" | "Contacter l'administration"
  certificate: boolean; certifications: CertificationItem[]
  rating: number; reviewsCount: number; whatYouWillLearn: string[]
  tags: string[]; modules: AdminModule[]
  coverImage?: File | string | null; coverPreview?: string | null
}

type CoursesCrudProps = {
  initialCourses?: AdminCourse[]
  onSave?: (course: AdminCourse) => Promise<AdminCourse>
  onDelete?: (id: string) => Promise<void>
  onView?: (course: AdminCourse) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeModulesOrder = (modules: AdminModule[]): AdminModule[] =>
  modules.map((m, mi) => ({ ...m, order: mi + 1, lessons: m.lessons.map((l, li) => ({ ...l, order: li + 1 })) }))

const getFileName = (file: File | string) => typeof file === "string" ? file : file.name
const stripFileExtension = (name: string) => name.replace(/\.[^.]+$/, "")

const normalizeLessonResources = (lesson: AdminLesson): AdminLesson => {
  const raw = lesson.attachments ?? []
  const attachments: (File | string)[] = Array.isArray(raw) ? raw : raw ? [raw as any] : []
  const existingMeta = lesson.attachmentsMeta ?? []
  // If attachments is empty, preserve existingMeta as-is so server-side files
  // saved in attachmentsMeta are not wiped out when the file field returns nothing.
  const normalizedMeta: AttachmentMeta[] = attachments.length === 0
    ? existingMeta
    : attachments.map((file, idx) => {
        const name = getFileName(file)
        // Try name match first (handles PocketBase-renamed files), fall back to index
        const prev = existingMeta.find(m => m.name === name) ?? existingMeta[idx] ?? { name }
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

  // Work on copies so we never mutate existingMeta in place
  const metaCopy = normalizedMeta.map(m => ({ ...m }))
  const linksCopy = youtubeLinks.map(l => ({ ...l }))

  const resources = [
    ...metaCopy.map((m, i) => ({ kind: "attachment" as const, index: i, order: m.order ?? 0, fallback: i })),
    ...linksCopy.map((l, i) => ({ kind: "youtube" as const, index: i, order: l.order ?? 0, fallback: i + metaCopy.length })),
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
    if (r.kind === "attachment") metaCopy[r.index] = { ...metaCopy[r.index], order }
    else linksCopy[r.index] = { ...linksCopy[r.index], order }
  })

  return { ...lesson, attachmentsMeta: metaCopy, youtubeLinks: linksCopy }
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
    <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
      {children}{required && <span className="ml-1 text-red-500">*</span>}
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
      className="w-full rounded-[10px] border-[1.5px] border-slate-200 bg-white px-[14px] py-[10px] text-sm text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:text-slate-300 focus:border-[var(--accent,#6366f1)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
      style={style}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full resize-none rounded-[10px] border-[1.5px] border-slate-200 bg-white px-[14px] py-[10px] text-sm leading-[1.6] text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:text-slate-300 focus:border-[var(--accent,#6366f1)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
    />
  )
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-slate-200 bg-white py-[10px] pl-[14px] pr-9 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] focus:border-[var(--accent,#6366f1)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
      >
        {children}
      </select>
      <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400" />
    </div>
  )
}

function IconBtn({ onClick, title, color = "#475569", hoverBg = "#f1f5f9", children }: {
  onClick: (e: React.MouseEvent) => void; title?: string; color?: string; hoverBg?: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title}
      className="flex cursor-pointer items-center justify-center rounded-lg border-0 p-[7px] transition-colors hover:bg-[var(--icon-hover-bg)]"
      style={{ color, ["--icon-hover-bg" as any]: hoverBg }}
    >
      {children}
    </button>
  )
}

function FormCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#edf0f7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-b from-[#fafbfe] to-white px-[22px] py-[14px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[rgba(99,102,241,0.1)] to-[rgba(129,140,248,0.05)] text-[var(--accent,#6366f1)]">
            {icon}
          </div>
          <h3 className="m-0 text-sm font-bold tracking-[-0.01em] text-slate-900">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-[22px] py-5">{children}</div>
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
    <div className="flex flex-col gap-2">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-5 transition-colors ${dragging
          ? "border-[var(--accent,#6366f1)] bg-[rgba(99,102,241,0.03)]"
          : "border-[#dde3f0] bg-[#fafbfd] hover:border-[var(--accent,#6366f1)]"}`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-gradient-to-br from-[rgba(99,102,241,0.12)] to-[rgba(129,140,248,0.06)]">
          <Upload className="h-4 w-4 text-[var(--accent,#6366f1)]" />
        </div>
        <p className="m-0 text-center text-xs font-semibold text-slate-500">
          Glisser ou <span className="text-[var(--accent,#6366f1)]">parcourir</span>
        </p>
        <p className="m-0 text-[11px] text-slate-400">PDF � DOC � DOCX</p>
        <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx" className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || [])
            if (files.length) onFiles(files, files.map(f => ({ name: f.name, description: "" })))
            e.target.value = ""
          }}
        />
      </div>

      {/* File chips */}
      {(existingMeta ?? []).length > 0 && (
        <div className="flex flex-col gap-[5px]">
          {existingMeta?.map((meta, idx) => {
            const { bg, text } = extColor(meta.name)
            const ext = meta.name.split(".").pop()?.toUpperCase() ?? "FILE"
            return (
              <div key={idx} className="flex flex-col gap-1.5 rounded-[10px] border border-[#edf0f7] bg-slate-50 px-[11px] py-[9px]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]" style={{ background: bg }}>
                    <FileText className="h-[13px] w-[13px]" style={{ color: text }} />
                  </div>
                  <p className="m-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold text-slate-700">{meta.name}</p>
                  <span className="rounded-[5px] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em]" style={{ background: bg, color: text }}>{ext}</span>
                </div>
                {onDescriptionChange && (
                  <input type="text" placeholder="Description du fichier..." value={meta.description || ""}
                    onChange={e => onDescriptionChange(idx, e.target.value)}
                    className="w-full rounded-[7px] border border-slate-200 bg-white px-[9px] py-[5px] text-[11px] text-slate-600 outline-none transition-colors placeholder:text-slate-300 focus:border-[var(--accent,#6366f1)]"
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
function YoutubeManager({ links, onChange }: { links: YoutubeLinkItem[]; onChange: (links: YoutubeLinkItem[]) => void }) {
  const addLink = () => onChange([...links, { url: "", description: "" }])
  const removeLink = (idx: number) => onChange(links.filter((_, i) => i !== idx))
  const update = (idx: number, field: "url" | "description", val: string) => {
    const next = [...links]; next[idx] = { ...next[idx], [field]: val }; onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {links.map((link, idx) => {
        const ytId = getYoutubeId(link.url)
        return (
          <div key={idx} className="overflow-hidden rounded-[10px] border border-[#edf0f7] bg-[#fafbfd]">
            <div className="flex">
              {/* Thumbnail */}
              <div className="relative flex min-h-14 w-20 shrink-0 items-center justify-center overflow-hidden" style={{ background: ytId ? "none" : "linear-gradient(135deg,#1a1a2e,#2d1b4e)" }}>
                {ytId ? (
                  <>
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#ff0000]">
                        <div className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <Film className="h-5 w-5 text-[rgba(99,102,241,0.5)]" />
                )}
              </div>
              {/* Fields */}
              <div className="flex flex-1 flex-col gap-[5px] px-[10px] py-2">
                <div className="flex items-center gap-[5px]">
                  <Youtube className="h-3 w-3 shrink-0 text-[#ff0000]" />
                  <input type="url" placeholder="URL YouTube..." value={link.url} onChange={e => update(idx, "url", e.target.value)}
                    className="flex-1 rounded-[7px] border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 outline-none transition-colors placeholder:text-slate-300 focus:border-[var(--accent,#6366f1)]"
                  />
                  <button onClick={() => removeLink(idx)} className="flex cursor-pointer rounded-[5px] border-0 bg-transparent p-[3px] text-slate-400 transition-colors hover:text-rose-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <input type="text" placeholder="Description (optionnelle)" value={link.description || ""} onChange={e => update(idx, "description", e.target.value)}
                  className="rounded-[7px] border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500 outline-none transition-colors placeholder:text-slate-300 focus:border-[var(--accent,#6366f1)] focus:bg-white"
                />
              </div>
            </div>
          </div>
        )
      })}

      <button onClick={addLink}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#dde3f0] bg-transparent px-3 py-[9px] text-[11px] font-semibold text-[var(--accent,#6366f1)] transition-colors hover:border-[var(--accent,#6366f1)] hover:bg-[rgba(99,102,241,0.04)]"
      >
        <Youtube className="h-3 w-3 text-[#ff0000]" /> Ajouter un lien YouTube
      </button>
    </div>
  )
}
export default function CoursesCrud({ initialCourses = [], onSave, onDelete, onView }: CoursesCrudProps) {
  const router = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [hoveredTagsCourseId, setHoveredTagsCourseId] = useState<string | null>(null)
  const [tagsTooltipPos, setTagsTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [filterTag, setFilterTag] = useState<string>("all")
  const [filterCertificate, setFilterCertificate] = useState<"all" | "yes" | "no">("all")
  const [filterPrereq, setFilterPrereq] = useState<"all" | "none" | "contact">("all")

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
  useEffect(() => {
    return () => {
      if (editingCourse?.coverPreview?.startsWith("blob:")) URL.revokeObjectURL(editingCourse.coverPreview)
    }
  }, [editingCourse?.coverPreview])

  const createBlankCourse = (): AdminCourse => ({ title: "", shortDescription: "", longDescription: "", durationLabel: "", prerequis: "Aucun", certificate: true, certifications: [], rating: 4.8, reviewsCount: 0, whatYouWillLearn: [""], tags: [], modules: [], coverImage: null, coverPreview: null })

  const allTags = Array.from(new Set(courses.flatMap(c => c.tags ?? [])))
  const filteredCourses = courses.filter(c => {
    const q = searchTerm.toLowerCase()
    if (q && !c.title.toLowerCase().includes(q) && !c.shortDescription.toLowerCase().includes(q) && !c.longDescription?.toLowerCase().includes(q)) return false
    if (filterTag !== "all" && !c.tags?.includes(filterTag)) return false
    if (filterCertificate === "yes" && !c.certificate) return false
    if (filterCertificate === "no" && c.certificate) return false
    if (filterPrereq === "none" && c.prerequis !== "Aucun") return false
    if (filterPrereq === "contact" && c.prerequis !== "Contacter l'administration") return false
    return true
  })

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
    const certifications = (course.certifications ?? []).map((cert) => ({
      ...cert,
      imageFile: null,
      imagePreview: cert.imageUrl ?? null,
    }))
    setEditingCourse({ ...JSON.parse(JSON.stringify(course)), certifications, modules: normalizedModules, coverPreview: typeof course.coverImage === "string" ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/courses/${course.id}/${course.coverImage}` : null, coverImage: null })
    setIsCreating(false); setExpandedModules(new Set())
  }
  const handleNewCourse = () => { setEditingCourse(createBlankCourse()); setIsCreating(true); setExpandedModules(new Set()) }

const handleCancelEdit = () => { setEditingCourse(null); setIsCreating(false) }

  const handleSaveCourse = async () => {
    if (!editingCourse) return
    if (!editingCourse.title.trim()) { showToast("error", "Le titre est obligatoire"); return }
    setLoading(true); const lid = showToast("loading", "Enregistrement en cours…")
    try {
      const saved = onSave ? await onSave(editingCourse) : null
      if (saved) {
        const merged: AdminCourse = {
          ...saved,
          coverPreview: editingCourse.coverPreview,
          coverImage: saved.coverImage ?? editingCourse.coverImage,
          certifications: (saved.certifications ?? []).map((cert, index) => ({
            ...cert,
            imageFile: null,
            imagePreview: cert.imageUrl ?? editingCourse.certifications[index]?.imagePreview ?? null,
          })),
        }
        setEditingCourse(merged)
        setCourses(prev =>
          prev.some(c => c.id === saved.id)
            ? prev.map(c => (c.id === saved.id ? merged : c))
            : [...prev, merged],
        )
        setIsCreating(false)
      }
      removeToast(lid); showToast("success", "Formation enregistrée avec succès !")
    } catch (err: any) { removeToast(lid); showToast("error", err.message || "Erreur lors de l'enregistrement") }
    finally { setLoading(false) }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Archiver cette formation ?")) return
    try {
      if (onDelete) await onDelete(id)
      setCourses(prev => prev.filter(c => c.id !== id))
      if (editingCourse?.id === id) setEditingCourse(null)
      showToast("success", "Formation archivée.")
    } catch (err: any) { showToast("error", err.message || "Erreur lors de l'archivage") }
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
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      <AdminPageHeader
        title="Formations"
        description="Gérez le catalogue de formations"
        breadcrumbs={[{ label: "Formations" }]}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.push("/admin-dashboard/courses/archive")}
              style={{ padding: "9px 20px", background: "#f8fafc", color: "#475569", border: "1.5px solid #e8ecf3", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.06)"; e.currentTarget.style.color = "var(--accent,#6366f1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#e8ecf3" }}
            >
              <Archive style={{ width: 15, height: 15 }} /> Archives
            </button>
            <button onClick={handleNewCourse}
              style={{ padding: "9px 20px", background: "var(--accent,#6366f1)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <Plus style={{ width: 15, height: 15 }} /> Nouvelle formation
            </button>
          </div>
        }
      />

      {/* ── Filters bar ── */}
      <div style={{ padding: "14px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#475569" }} />
          <input type="text" placeholder="Rechercher…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "7px 12px 7px 34px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
            onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)" }}
            onBlur={e => { e.target.style.borderColor = "#e8ecf3"; e.target.style.boxShadow = "none" }}
          />
        </div>

        {/* Certificate select */}
        <select value={filterCertificate} onChange={e => setFilterCertificate(e.target.value as any)}
          style={{ padding: "7px 12px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, color: filterCertificate !== "all" ? "var(--accent,#6366f1)" : "#475569", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
          <option value="all">Certificat: tous</option>
          <option value="yes">Avec certificat</option>
          <option value="no">Sans certificat</option>
        </select>

        {/* Prerequisite select */}
        <select value={filterPrereq} onChange={e => setFilterPrereq(e.target.value as any)}
          style={{ padding: "7px 12px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, color: filterPrereq !== "all" ? "var(--accent,#6366f1)" : "#475569", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
          <option value="all">Prérequis: tous</option>
          <option value="none">Aucun prérequis</option>
          <option value="contact">Sur demande</option>
        </select>

        {/* Tag select */}
        {allTags.length > 0 && (
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
            style={{ padding: "7px 12px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, color: filterTag !== "all" ? "var(--accent,#6366f1)" : "#475569", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
            <option value="all">Tag: tous</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        )}

<div style={{ fontSize: 13, color: "#475569", marginLeft: "auto" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{filteredCourses.length}</span> formation{filteredCourses.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Table ── */}
      {(() => {
        const displayCourses = filteredCourses
        const isEmpty = displayCourses.length === 0

        return (
          <div style={{ padding: "0px 0px" }}>
            {isEmpty ? (
              <div style={{ background: "#fff", padding: "64px 24px", textAlign: "center" }}>
                <BookOpen style={{ width: 40, height: 40, color: "#e2e8f0", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 4px" }}>Aucune formation trouvée</p>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Créez votre première formation avec le bouton ci-dessus.</p>
              </div>
            ) : (
              <div style={{ background: "#fff", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 190px", padding: "18px 36px", borderBottom: "1px solid #f1f5f9", background: "#fafbfd" }}>
                  {["Formation", "Tags", "Actions"].map(h => (
                    <span key={h} style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                  ))}
                </div>
                {displayCourses.map((course, idx) => (
                  <div key={course.id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 180px 190px", padding: "32px 36px", borderBottom: idx < displayCourses.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Title + description */}
                    <div style={{ minWidth: 0, paddingRight: 24 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                        {course.coverPreview || (course.coverImage && typeof course.coverImage === "string") ? (
                          <img src={course.coverPreview || `${process.env.NEXT_PUBLIC_PB_URL}/api/files/courses/${course.id}/${course.coverImage}`}
                            onClick={() => handleSelectCourse(course)}
                            style={{ width: 320, height: 180, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer" }} alt="" />
                        ) : (
                          <div onClick={() => handleSelectCourse(course)} style={{ width: 320, height: 180, borderRadius: 4, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                            <BookOpen style={{ width: 30, height: 30, color: "var(--accent,#6366f1)" }} />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p
                            onClick={() => handleSelectCourse(course)}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent,#6366f1)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#0f172a")}
                            style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", cursor: "pointer", transition: "color 0.15s" }}
                          >{course.title || "Sans titre"}</p>
                          <p style={{ fontSize: 14, color: "#475569", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" }}>{course.longDescription}</p>
                        </div>
                      </div>
                    </div>
                    {/* Tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", overflow: "hidden", alignContent: "flex-start", alignSelf: "stretch" }}>
                      {course.tags?.slice(0, 4).map((tag, i) => (
                        <span key={`${tag}-${i}`} style={{ fontSize: 13, padding: "5px 13px", borderRadius: 8, background: "rgba(99,102,241,0.08)", color: "var(--accent,#6366f1)", fontWeight: 600 }}>{tag}</span>
                      ))}
                      {(course.tags?.length || 0) > 4 && (
                        <span
                          style={{ fontSize: 13, padding: "5px 10px", borderRadius: 8, background: "#f1f5f9", color: "#475569", fontWeight: 600, cursor: "default" }}
                          onMouseEnter={e => { setTagsTooltipPos({ x: e.clientX, y: e.clientY + 16 }); setHoveredTagsCourseId(course.id ?? null) }}
                          onMouseLeave={() => setHoveredTagsCourseId(null)}
                        >+{course.tags.length - 4}</span>
                      )}
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {onView && <IconBtn onClick={e => { e.stopPropagation(); onView(course) }} color="#475569" title="Voir"><ExternalLink style={{ width: 22, height: 22 }} /></IconBtn>}
                      <IconBtn onClick={e => { e.stopPropagation(); handleSelectCourse(course) }} color="var(--accent,#6366f1)" hoverBg="rgba(99,102,241,0.08)" title="Modifier"><Edit style={{ width: 22, height: 22 }} /></IconBtn>
                      <IconBtn onClick={e => { e.stopPropagation(); course.id && handleDeleteCourse(course.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)" title="Archiver"><Archive style={{ width: 22, height: 22 }} /></IconBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Modal overlay ── */}
      {editingCourse && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }} onClick={handleCancelEdit} />
          <div className="course-modal-inner" style={{ position: "relative", background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)", width: "100%", maxWidth: 880, maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Accent strip at top */}
            <div style={{ height: 3, background: "linear-gradient(90deg,var(--accent,#6366f1),#818cf8,#a78bfa)", flexShrink: 0 }} />
            {/* Modal header */}
            <div style={{ padding: "20px 28px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "#fff" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a5b4fc", margin: "0 0 4px" }}>{isCreating ? "Nouvelle formation" : "Modifier"}</p>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{editingCourse.title || "Sans titre"}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={handleSaveCourse} disabled={loading}
                  style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: loading ? "#f1f5f9" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading ? "#475569" : "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)", transition: "all 0.2s" }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)" }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(99,102,241,0.35)" }}
                >
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                  {loading ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button onClick={handleCancelEdit}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid #e8ecf3", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8ecf3"; (e.currentTarget as HTMLButtonElement).style.color = "#475569"; (e.currentTarget as HTMLButtonElement).style.background = "#fff" }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>

            {/* Modal body (scrollable form) */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f7f9fc" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

                {/* ── Cover 16:9 ── */}
                <div style={{ position: "relative" }}>
                  <div
                    onClick={() => document.getElementById("coverInput")?.click()}
                    style={{ width: "100%", paddingTop: "56.25%", position: "relative", borderRadius: 16, border: "2px dashed #dde3f0", background: editingCourse.coverPreview ? "none" : "linear-gradient(135deg,#f0f4ff,#fafbfe)", cursor: "pointer", overflow: "hidden", transition: "border-color 0.15s, background 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLDivElement).style.background = editingCourse.coverPreview ? "none" : "linear-gradient(135deg,#eef2ff,#f5f3ff)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#dde3f0"; (e.currentTarget as HTMLDivElement).style.background = editingCourse.coverPreview ? "none" : "linear-gradient(135deg,#f0f4ff,#fafbfe)" }}
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
                          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 16px rgba(99,102,241,0.15)" }}>
                            <ImagePlus style={{ width: 26, height: 26, color: "var(--accent,#6366f1)" }} />
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: 0 }}>Ajouter une image de couverture</p>
                          <p style={{ fontSize: 12, color: "#475569", marginTop: 5 }}>Format recommandé : 1280 × 720 (16:9)</p>
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
                          style={{ flex: 1, padding: "9px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
                          onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
                          onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                        />
                        <IconBtn onClick={() => handleRemoveWhatItem(index)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                      </div>
                    ))}
                    <button onClick={handleAddWhatItem}
                      style={{ marginTop: 4, padding: "10px", borderRadius: 10, border: "1.5px dashed #dde3f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#dde3f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                    >+ Ajouter un objectif</button>
                  </div>
                </FormCard>

                {/* ── Tags ── */}
                <FormCard title="Tags" icon={<Tag style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {editingCourse.tags.map((tag, index) => (
                      <div key={index} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(129,140,248,0.04))", border: "1px solid rgba(99,102,241,0.18)", color: "var(--accent,#6366f1)", padding: "5px 12px", borderRadius: 20 }}>
                        <input value={tag} onChange={e => handleUpdateTag(index, e.target.value)} placeholder="Tag" style={{ background: "transparent", border: "none", outline: "none", minWidth: 60, fontSize: 12, fontWeight: 600, color: "inherit", fontFamily: "inherit" }} />
                        <button onClick={() => handleRemoveTag(index)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", opacity: 0.7, display: "flex" }}><X style={{ width: 11, height: 11 }} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleAddTag}
                    style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px dashed #dde3f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#dde3f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                  >+ Ajouter un tag</button>
                </FormCard>

                {/* ── Stats & Certificat ── */}
                <FormCard title="Certificat" icon={<Award style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, background: editingCourse.certificate ? "linear-gradient(135deg,rgba(34,197,94,0.05),rgba(16,185,129,0.03))" : "#f8fafc", border: `1.5px solid ${editingCourse.certificate ? "rgba(34,197,94,0.2)" : "#e2e8f0"}`, transition: "all 0.2s" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>Certificat inclus</p>
                        <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{editingCourse.certificate ? "Les apprenants reçoivent un certificat" : "Aucun certificat pour cette formation"}</p>
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
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>Certification {index + 1}</span>
                              <IconBtn onClick={() => setEditingCourse({ ...editingCourse, certifications: editingCourse.certifications.filter((_, i) => i !== index) })} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                            </div>
                            <div
                              onClick={() => document.getElementById(`certificationImageInput-${index}`)?.click()}
                              style={{ position: "relative", width: "100%", paddingTop: "56.25%", marginBottom: 14, borderRadius: 12, border: "2px dashed #dde3f0", background: cert.imagePreview || cert.imageUrl ? "#fff" : "linear-gradient(135deg,#f8fafc,#eef2ff)", cursor: "pointer", overflow: "hidden", transition: "border-color 0.15s, background 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent,#6366f1)" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#dde3f0" }}
                            >
                              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {cert.imagePreview || cert.imageUrl ? (
                                  <>
                                    <img src={cert.imagePreview || cert.imageUrl || ""} alt={cert.title || "Certification"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(15,23,42,0.48)", color: "#fff", opacity: 0, transition: "opacity 0.2s" }}
                                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "0"}
                                    >
                                      <ImagePlus style={{ width: 24, height: 24 }} />
                                      <span style={{ fontSize: 13, fontWeight: 700 }}>Changer l'image</span>
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ textAlign: "center" }}>
                                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                                      <ImagePlus style={{ width: 22, height: 22, color: "var(--accent,#6366f1)" }} />
                                    </div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "#475569", margin: 0 }}>Ajouter l'image du certificat</p>
                                    <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>Format recommandÃ© : 16:9</p>
                                  </div>
                                )}
                              </div>
                              <input
                                id={`certificationImageInput-${index}`}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                                onClick={e => e.stopPropagation()}
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const c = [...editingCourse.certifications]
                                  c[index] = { ...c[index], imageFile: file, imagePreview: URL.createObjectURL(file) }
                                  setEditingCourse({ ...editingCourse, certifications: c })
                                }}
                              />
                              <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(15,23,42,0.62)", color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 7 }}>
                                16 : 9
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <FieldLabel>Nom du certificat</FieldLabel>
                                <input type="text" value={cert.title} onChange={e => { const c = [...editingCourse.certifications]; c[index].title = e.target.value; setEditingCourse({ ...editingCourse, certifications: c }) }}
                                  style={{ width: "100%", padding: "9px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
                                  onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }} onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                                />
                              </div>
                              <div>
                                <FieldLabel>Institut / Organisme</FieldLabel>
                                <input type="text" value={cert.issuer || ""} onChange={e => { const c = [...editingCourse.certifications]; c[index].issuer = e.target.value; setEditingCourse({ ...editingCourse, certifications: c }) }}
                                  style={{ width: "100%", padding: "9px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
                                  onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }} onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setEditingCourse({ ...editingCourse, certifications: [...editingCourse.certifications, { title: "" }] })}
                          style={{ padding: "10px", borderRadius: 10, border: "1.5px dashed #dde3f0", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.04)" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#dde3f0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                        >+ Ajouter une certification</button>
                      </div>
                    )}
                  </div>
                </FormCard>

                {/* ── Modules ── */}
                {editingCourse && false && (
                <FormCard title="Modules & Leçons" icon={<Layers style={{ width: 16, height: 16 }} />}
                  action={
                    <button onClick={handleAddModule} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.05)", color: "var(--accent,#6366f1)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent,#6366f1)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.05)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.25)" }}
                    >
                      <Plus style={{ width: 12, height: 12 }} /> Ajouter un module
                    </button>
                  }
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(editingCourse!.modules ?? []).map((module, mi) => {
                      const isExpanded = expandedModules.has(mi)
                      return (
                        <div key={mi} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e8ecf4", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                          {/* ── Module header ── */}
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: isExpanded ? "#fafbff" : "#fff", borderBottom: isExpanded ? "1px solid #eef2ff" : "none", transition: "background 0.15s" }}
                            onClick={() => { const next = new Set(expandedModules); isExpanded ? next.delete(mi) : next.add(mi); setExpandedModules(next) }}
                          >
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{mi + 1}</div>
                            <input type="text" value={module.title} onChange={e => { e.stopPropagation(); handleModuleChange(mi, "title", e.target.value) }} onClick={e => e.stopPropagation()} placeholder="Titre du module"
                              style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#0f172a", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent,#6366f1)", background: "rgba(99,102,241,0.08)", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                              {module.lessons.length} leçon{module.lessons.length !== 1 ? "s" : ""}
                            </span>
                            <input type="text" value={module.durationLabel} onChange={e => { e.stopPropagation(); handleModuleChange(mi, "durationLabel", e.target.value) }} onClick={e => e.stopPropagation()} placeholder="Durée"
                              style={{ width: 68, padding: "4px 8px", background: "#f8fafc", border: "1px solid #edf0f7", borderRadius: 6, fontSize: 11, color: "#475569", outline: "none", fontFamily: "inherit", textAlign: "center" }} />
                            <div style={{ display: "flex", gap: 1 }} onClick={e => e.stopPropagation()}>
                              <IconBtn onClick={() => handleMoveModule(mi, "up")} color="#475569"><ChevronUp style={{ width: 13, height: 13 }} /></IconBtn>
                              <IconBtn onClick={() => handleMoveModule(mi, "down")} color="#475569"><ChevronDown style={{ width: 13, height: 13 }} /></IconBtn>
                              <IconBtn onClick={() => handleRemoveModule(mi)} color="#ef4444" hoverBg="rgba(239,68,68,0.06)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                            </div>
                            <ChevronRight style={{ width: 14, height: 14, color: "#c7d2e0", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                          </div>

                          {/* ── Lessons list ── */}
                          {isExpanded && (
                            <div>
                              {module.lessons.map((lesson, li) => (
                                <div key={li} style={{ borderBottom: li < module.lessons.length - 1 ? "1px solid #f1f5f9" : "none" }}>

                                  {/* Lesson row */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 5, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <Video style={{ width: 10, height: 10, color: "var(--accent,#6366f1)" }} />
                                    </div>
                                    <input type="text" value={lesson.title} onChange={e => handleLessonChange(mi, li, "title", e.target.value)} placeholder="Titre de la leçon"
                                      style={{ flex: 1, padding: "6px 10px", background: "#f8fafc", border: "1px solid #edf0f7", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
                                      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)"; e.target.style.background = "#fff" }}
                                      onBlur={e => { e.target.style.borderColor = "#edf0f7"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc" }}
                                    />
                                    <input type="text" value={lesson.durationLabel} onChange={e => handleLessonChange(mi, li, "durationLabel", e.target.value)} placeholder="Durée"
                                      style={{ width: 60, padding: "6px 8px", background: "#f8fafc", border: "1px solid #edf0f7", borderRadius: 8, fontSize: 11, color: "#475569", outline: "none", fontFamily: "inherit", textAlign: "center" }} />
                                    <div style={{ display: "flex", gap: 1 }}>
                                      <IconBtn onClick={() => handleMoveLesson(mi, li, "up")} color="#475569"><ChevronUp style={{ width: 12, height: 12 }} /></IconBtn>
                                      <IconBtn onClick={() => handleMoveLesson(mi, li, "down")} color="#475569"><ChevronDown style={{ width: 12, height: 12 }} /></IconBtn>
                                      <IconBtn onClick={() => handleRemoveLesson(mi, li)} color="#ef4444" hoverBg="rgba(239,68,68,0.06)"><Trash2 style={{ width: 12, height: 12 }} /></IconBtn>
                                    </div>
                                  </div>

                                  {/* Resources */}
                                  <div style={{ paddingLeft: 42, paddingRight: 14, paddingBottom: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                                    {buildLessonResources(lesson).map((res, ri) => {
                                      const isYoutube = res.kind === "youtube"
                                      const ytId = isYoutube ? getYoutubeId(res.url || "") : null
                                      return (
                                        <div key={`${res.kind}-${res.index}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#f8fafc", border: "1px solid #edf0f7", borderRadius: 9, padding: "7px 10px" }}>
                                          {/* Type badge */}
                                          <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, overflow: "hidden", position: "relative", background: isYoutube ? "#0f172a" : "rgba(99,102,241,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {isYoutube ? (
                                              ytId ? (
                                                <>
                                                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                      <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "2px 0 2px 3.5px", borderColor: "transparent transparent transparent #fff", marginLeft: 1 }} />
                                                    </div>
                                                  </div>
                                                </>
                                              ) : <Youtube style={{ width: 11, height: 11, color: "#ff3333" }} />
                                            ) : <FileText style={{ width: 11, height: 11, color: "var(--accent,#6366f1)" }} />}
                                          </div>

                                          {/* Editable fields */}
                                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                                            <input type="text" placeholder={isYoutube ? "Titre de la vidéo" : "Titre du fichier"} value={res.title}
                                              onChange={e => { if (isYoutube) updateLessonYoutubeMeta(mi, li, res.index, "title", e.target.value); else updateLessonAttachmentMeta(mi, li, res.index, "title", e.target.value) }}
                                              style={{ fontSize: 12, fontWeight: 500, color: "#0f172a", background: "transparent", border: "none", outline: "none", fontFamily: "inherit", padding: 0, width: "100%" }}
                                            />
                                            {isYoutube ? (
                                              <input type="url" placeholder="https://youtube.com/watch?v=…" value={res.url || ""}
                                                onChange={e => updateLessonYoutubeMeta(mi, li, res.index, "url", e.target.value)}
                                                style={{ fontSize: 11, color: "#475569", background: "transparent", border: "none", outline: "none", fontFamily: "inherit", padding: 0, width: "100%" }}
                                              />
                                            ) : (
                                              <span style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{res.name || "Fichier joint"}</span>
                                            )}
                                            <input type="text" placeholder="Description (optionnelle)" value={res.description || ""}
                                              onChange={e => { if (isYoutube) updateLessonYoutubeMeta(mi, li, res.index, "description", e.target.value); else updateLessonAttachmentMeta(mi, li, res.index, "description", e.target.value) }}
                                              style={{ fontSize: 11, color: "#475569", background: "transparent", border: "none", outline: "none", fontFamily: "inherit", padding: 0, width: "100%" }}
                                            />
                                          </div>

                                          {/* Order + actions */}
                                          <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", background: "#edf0f7", width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{res.order}</span>
                                          <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                                            <IconBtn onClick={() => moveLessonResource(mi, li, ri, "up")} color="#475569"><ChevronUp style={{ width: 11, height: 11 }} /></IconBtn>
                                            <IconBtn onClick={() => moveLessonResource(mi, li, ri, "down")} color="#475569"><ChevronDown style={{ width: 11, height: 11 }} /></IconBtn>
                                            <IconBtn onClick={() => removeLessonResource(mi, li, res.kind, res.index)} color="#ef4444" hoverBg="rgba(239,68,68,0.06)"><Trash2 style={{ width: 11, height: 11 }} /></IconBtn>
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* Add resource buttons */}
                                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                                      <label htmlFor={`lesson-files-${mi}-${li}`}
                                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px dashed #dde3f0", color: "var(--accent,#6366f1)", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.12s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLLabelElement).style.background = "rgba(99,102,241,0.04)" }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = "#dde3f0"; (e.currentTarget as HTMLLabelElement).style.background = "transparent" }}
                                      >
                                        <Upload style={{ width: 10, height: 10 }} /> Fichier
                                      </label>
                                      <input id={`lesson-files-${mi}-${li}`} type="file" multiple accept=".pdf,.doc,.docx" style={{ display: "none" }}
                                        onChange={e => { const files = Array.from(e.target.files || []); if (files.length) addLessonAttachments(mi, li, files); e.currentTarget.value = "" }}
                                      />
                                      <button onClick={() => addLessonYoutube(mi, li)}
                                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px dashed rgba(255,51,51,0.25)", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", transition: "all 0.12s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#f87171"; (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5" }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,51,51,0.25)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                      >
                                        <Youtube style={{ width: 10, height: 10 }} /> YouTube
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Add lesson */}
                              <div style={{ padding: "8px 14px", borderTop: module.lessons.length > 0 ? "1px solid #f1f5f9" : "none", background: "#fafbfe" }}>
                                <button onClick={() => handleAddLesson(mi)}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, border: "none", background: "transparent", color: "var(--accent,#6366f1)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.12s" }}
                                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.06)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                                >
                                  <Plus style={{ width: 13, height: 13 }} /> Ajouter une leçon
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {(editingCourse!.modules ?? []).length === 0 && (
                      <div style={{ padding: "44px 24px", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1.5px dashed #e2e8f0" }}>
                        <Layers style={{ width: 30, height: 30, color: "#cbd5e1", margin: "0 auto 10px" }} />
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#475569", margin: 0 }}>Aucun module. Commencez par en ajouter un.</p>
                      </div>
                    )}
                  </div>
                </FormCard>
                )}

                <div style={{ height: 32 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tags tooltip */}
      {hoveredTagsCourseId && (() => {
        const course = courses.find(c => c.id === hoveredTagsCourseId)
        if (!course || (course.tags?.length || 0) <= 4) return null
        return (
          <div style={{ position: "fixed", zIndex: 9999, left: tagsTooltipPos.x, top: tagsTooltipPos.y, transform: "translateX(-50%)", background: "#fafbfd", border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 240, pointerEvents: "none" }}>
            {course.tags.slice(4).map((tag, i) => (
              <span key={`tooltip-${tag}-${i}`} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(99,102,241,0.08)", color: "var(--accent,#6366f1)", fontWeight: 600, whiteSpace: "nowrap" }}>{tag}</span>
            ))}
          </div>
        )
      })()}

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
                <button onClick={() => removeToast(toast.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#475569", display: "flex" }}><X style={{ width: 14, height: 14 }} /></button>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: ok ? "#22c55e" : "#f43f5e", width: `${progress}%`, transition: "width 0.1s linear" }} />
            </div>
          )
        })}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.97) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .course-modal-inner{animation:modalIn 0.22s cubic-bezier(0.22,1,0.36,1) forwards;font-family:'Plus Jakarta Sans',sans-serif}
        .course-modal-inner ::-webkit-scrollbar{width:5px}
        .course-modal-inner ::-webkit-scrollbar-track{background:transparent}
        .course-modal-inner ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        .course-modal-inner ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
        .course-modal-inner input::placeholder,.course-modal-inner textarea::placeholder{color:#c0ccdc}
      `}</style>
    </div>
  )
}
