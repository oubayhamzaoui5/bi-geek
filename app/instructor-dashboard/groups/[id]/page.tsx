"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight, ChevronDown, Plus, Trash2, Save,
  BookOpen, Layers, Users, GraduationCap, Video,
  Paperclip, FileText, X, Check, Loader2, Upload,
  Play, ExternalLink, Pencil, AlertCircle, File,
  FolderOpen, LayoutList, ArrowLeft,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

type GroupStatus = "not_started" | "in_progress" | "completed"

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
  instructor: { id: string; name: string; surname: string } | null
  program: Program | null
}

type Module = { id: string; title: string; order: number; description: string }
type Lesson = { id: string; moduleId: string; title: string; order: number; description: string; content: string }
type Video  = { id: string; lessonId: string; title: string; driveUrl: string; description: string }
type Attachment = { id: string; lessonId?: string; videoId?: string; name: string; url: string | null }

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<GroupStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  not_started: { label: "Pas commencé", dot: "#94a3b8", text: "#64748b", bg: "#f1f5f9",     border: "#e2e8f0" },
  in_progress:  { label: "En cours",    dot: "#3b82f6", text: "#2563eb", bg: "#eff6ff",     border: "#bfdbfe" },
  completed:    { label: "Terminé",     dot: "#22c55e", text: "#16a34a", bg: "#f0fdf4",     border: "#bbf7d0" },
}

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

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#3b82f6",
]
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const router = useRouter()
  const { toasts, push } = useToast()

  // Data
  const [group, setGroup] = useState<Group | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [lessonAttachments, setLessonAttachments] = useState<Attachment[]>([])
  const [videoAttachments, setVideoAttachments] = useState<Attachment[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"contenu" | "videos" | "fichiers">("contenu")

  // Inline creation
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [addingLessonForModule, setAddingLessonForModule] = useState<string | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState("")

  // Lesson editing
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonDirty, setLessonDirty] = useState(false)

  // Module inline title edit
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingModuleTitle, setEditingModuleTitle] = useState("")

  // Video management
  const [addingVideoForLesson, setAddingVideoForLesson] = useState<string | null>(null)
  const [newVideo, setNewVideo] = useState({ title: "", driveUrl: "", description: "" })
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [videoEdits, setVideoEdits] = useState<Record<string, { title: string; driveUrl: string; description: string }>>({})

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFor, setUploadingFor] = useState<{ type: "lesson" | "video"; parentId: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  // ── Fetch group + curriculum ────────────────────────────────────────────────

  useEffect(() => {
    if (!groupId) return
    const load = async () => {
      setLoading(true)
      try {
        const [gRes, cRes] = await Promise.all([
          fetch(`/api/instructor/groups/${groupId}`),
          fetch(`/api/instructor/groups/${groupId}/curriculum`),
        ])
        if (gRes.ok) {
          const d = await gRes.json()
          if (d.ok) setGroup(d.group)
        }
        if (cRes.ok) {
          const d = await cRes.json()
          if (d.ok) {
            setModules(d.modules || [])
            setLessons(d.lessons || [])
            setVideos(d.videos || [])
            setLessonAttachments(d.lessonAttachments || [])
            setVideoAttachments(d.videoAttachments || [])
            if ((d.modules || []).length > 0) {
              setExpandedModules(new Set([(d.modules[0] as Module).id]))
            }
          }
        }
      } catch {
        push("err", "Impossible de charger le groupe")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [groupId])

  const selectLesson = (lesson: Lesson) => {
    if (lessonDirty && editingLesson) saveLesson(editingLesson)
    if (selectedLessonId === lesson.id) {
      setSelectedLessonId(null)
      setEditingLesson(null)
    } else {
      setSelectedLessonId(lesson.id)
      setEditingLesson({ ...lesson })
      setLessonDirty(false)
      setActiveTab("contenu")
    }
  }

  // ── Curriculum API helpers ──────────────────────────────────────────────────

  async function callCurriculum(method: string, body: object) {
    const res = await fetch(`/api/instructor/groups/${groupId}/curriculum`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || "Erreur")
    return d
  }

  // ── Module CRUD ─────────────────────────────────────────────────────────────

  async function createModule() {
    const title = newModuleTitle.trim()
    if (!title) return
    try {
      const d = await callCurriculum("POST", { type: "module", title })
      setModules(p => [...p, d.module])
      setExpandedModules(p => new Set([...p, d.module.id]))
      setNewModuleTitle("")
      setAddingModule(false)
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

  // ── Lesson CRUD ─────────────────────────────────────────────────────────────

  async function createLesson(moduleId: string) {
    const title = newLessonTitle.trim()
    if (!title) return
    try {
      const d = await callCurriculum("POST", { type: "lesson", moduleId, title })
      setLessons(p => [...p, d.lesson])
      setNewLessonTitle("")
      setAddingLessonForModule(null)
      selectLesson(d.lesson)
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
      setEditingLesson(d.lesson)
      setLessonDirty(false)
      push("ok", "Leçon enregistrée")
    } catch (e: any) { push("err", e.message) }
    finally { setSaving(false) }
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm("Supprimer cette leçon et tout son contenu ?")) return
    try {
      await callCurriculum("DELETE", { type: "lesson", id: lessonId })
      setLessons(p => p.filter(l => l.id !== lessonId))
      setVideos(p => p.filter(v => v.lessonId !== lessonId))
      setLessonAttachments(p => p.filter(a => a.lessonId !== lessonId))
      if (selectedLessonId === lessonId) { setSelectedLessonId(null); setEditingLesson(null) }
      push("ok", "Leçon supprimée")
    } catch (e: any) { push("err", e.message) }
  }

  // ── Video CRUD ──────────────────────────────────────────────────────────────

  async function createVideo(lessonId: string) {
    if (!newVideo.title.trim() && !newVideo.driveUrl.trim()) return
    try {
      const d = await callCurriculum("POST", {
        type: "video", lessonId,
        title: newVideo.title || "Vidéo",
        driveUrl: newVideo.driveUrl,
        description: newVideo.description,
      })
      setVideos(p => [...p, d.video])
      setNewVideo({ title: "", driveUrl: "", description: "" })
      setAddingVideoForLesson(null)
      push("ok", "Vidéo ajoutée")
    } catch (e: any) { push("err", e.message) }
  }

  async function saveVideo(videoId: string) {
    const edits = videoEdits[videoId]
    if (!edits) return
    try {
      const d = await callCurriculum("PATCH", { type: "video", id: videoId, ...edits, driveUrl: edits.driveUrl })
      setVideos(p => p.map(v => v.id === videoId ? d.video : v))
      setEditingVideoId(null)
      push("ok", "Vidéo mise à jour")
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

  // ── Attachments ─────────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadingFor || !e.target.files?.length) return
    const file = e.target.files[0]
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("type", uploadingFor.type)
      fd.append("parentId", uploadingFor.parentId)
      fd.append("name", file.name)
      fd.append("file", file)
      const res = await fetch(`/api/instructor/groups/${groupId}/attachments`, { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      if (uploadingFor.type === "lesson") {
        setLessonAttachments(p => [...p, { ...d.attachment, lessonId: uploadingFor.parentId }])
      } else {
        setVideoAttachments(p => [...p, { ...d.attachment, videoId: uploadingFor.parentId }])
      }
      push("ok", "Fichier uploadé")
    } catch (e: any) { push("err", e.message) }
    finally {
      setUploading(false)
      setUploadingFor(null)
      e.target.value = ""
    }
  }

  async function deleteAttachment(type: "lesson_attachment" | "video_attachment", id: string) {
    try {
      await fetch(`/api/instructor/groups/${groupId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      })
      if (type === "lesson_attachment") setLessonAttachments(p => p.filter(a => a.id !== id))
      else setVideoAttachments(p => p.filter(a => a.id !== id))
      push("ok", "Fichier supprimé")
    } catch (e: any) { push("err", e.message) }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const sortedModules = [...modules].sort((a, b) => a.order - b.order)

  // ── Loading / Error states ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#6366f1", animation: "spin 0.7s linear infinite" }} />
          <p style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500, fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>Chargement…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!group) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#64748b", margin: "0 0 8px" }}>Groupe introuvable</p>
          <Link href="/instructor-dashboard/groups" style={{ fontSize: 13, color: "#6366f1", textDecoration: "none" }}>
            ← Retour aux groupes
          </Link>
        </div>
      </div>
    )
  }

  const sm = STATUS_META[group.status]
  const isBootcamp = group.programType === "bootcamp"
  const totalLessons = lessons.length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "var(--ff-body,'DM Sans',sans-serif)", overflowY: "auto" }}>

      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #eef0f6", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => router.push("/instructor-dashboard/groups")}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; (e.currentTarget as HTMLButtonElement).style.color = "#4f46e5" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b" }}
          >
            <ArrowLeft size={14} /> Groupes
          </button>
          <ChevronRight size={13} style={{ color: "#cbd5e1" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.title}</span>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: sm.bg, color: sm.text, border: `1px solid ${sm.border}`, letterSpacing: "0.02em" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot, flexShrink: 0 }} />
          {sm.label}
        </span>
      </div>

      {/* ── Cover Image ──────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", height: 300, overflow: "hidden", background: isBootcamp ? "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)" : "linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)" }}>
        {group.program?.coverImage && (
          <img
            src={group.program.coverImage}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)" }} />

        {/* Bottom text */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 40px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: 6, backdropFilter: "blur(6px)", marginBottom: 8 }}>
            {isBootcamp ? <Layers size={11} /> : <BookOpen size={11} />}
            {isBootcamp ? "Bootcamp" : "Formation"}
            {group.program && ` · ${group.program.title}`}
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)", letterSpacing: "-0.03em", textShadow: "0 2px 12px rgba(0,0,0,0.2)", lineHeight: 1.15 }}>
            {group.title}
          </h1>
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eef0f6", padding: "0 40px" }}>
        <div style={{ display: "flex", gap: 0, maxWidth: 900, margin: "0 auto" }}>
          {[
            { icon: Users, value: group.studentIds.length, label: "Étudiants" },
            { icon: LayoutList, value: modules.length, label: "Modules" },
            { icon: FileText, value: totalLessons, label: "Leçons" },
            { icon: Video, value: videos.length, label: "Vidéos" },
          ].map(({ icon: Icon, value, label }, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 28px", borderRight: i < 3 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} color="#6366f1" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{value}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.03em", marginTop: 1 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Page content ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 40px 80px" }}>

        {/* ── Program Description ───────────────────────────────────────────────── */}
        {group.program && (group.program.longDescription || group.program.shortDescription) && (
          <section style={{ marginBottom: 36 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eef0f6", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={13} color="#6366f1" />
                </div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
                  À propos de ce programme
                </h2>
              </div>
              <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.75 }}>
                {group.program.longDescription || group.program.shortDescription}
              </p>
            </div>
          </section>
        )}

        {/* ── Students ──────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)", letterSpacing: "-0.02em" }}>
                Étudiants
              </h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 99 }}>
                {group.students.length}
              </span>
            </div>
            {group.instructor && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <GraduationCap size={13} color="#94a3b8" />
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                  Formateur : <strong style={{ color: "#0f172a", fontWeight: 700 }}>{[group.instructor.name, group.instructor.surname].filter(Boolean).join(" ")}</strong>
                </span>
              </div>
            )}
          </div>

          {group.students.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "32px 24px", textAlign: "center" }}>
              <Users size={28} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>Aucun étudiant inscrit</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {group.students.map(s => (
                <div key={s.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #eef0f6", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)")}
                >
                  {s.avatar ? (
                    <img src={s.avatar} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColor(s.id), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>
                      {initials(s.name, s.surname)}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[s.name, s.surname].filter(Boolean).join(" ") || s.username || "—"}
                    </p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Curriculum ────────────────────────────────────────────────────────── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)", letterSpacing: "-0.02em" }}>
              Contenu du groupe
            </h2>
            <button
              onClick={() => { setAddingModule(true); setTimeout(() => document.getElementById("new-module-input")?.focus(), 50) }}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "#6366f1", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.3)", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <Plus size={14} /> Nouveau module
            </button>
          </div>

          {/* New module inline input */}
          {addingModule && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px dashed #c7d2fe", padding: "14px 18px", marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <Plus size={14} color="#6366f1" style={{ flexShrink: 0 }} />
              <input
                id="new-module-input"
                autoFocus
                value={newModuleTitle}
                onChange={e => setNewModuleTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createModule(); if (e.key === "Escape") setAddingModule(false) }}
                placeholder="Nom du module…"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#0f172a", fontFamily: "inherit", background: "transparent" }}
              />
              <button onClick={createModule} style={{ padding: "6px 14px", background: "#6366f1", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>Créer</button>
              <button onClick={() => setAddingModule(false)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#94a3b8" }}><X size={13} /></button>
            </div>
          )}

          {/* Empty curriculum state */}
          {sortedModules.length === 0 && !addingModule && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "48px 32px", textAlign: "center" }}>
              <FolderOpen size={36} style={{ color: "#e2e8f0", margin: "0 auto 14px" }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: "#64748b", margin: "0 0 4px" }}>Aucun contenu pour le moment</p>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px" }}>Créez votre premier module pour organiser les leçons.</p>
              <button
                onClick={() => { setAddingModule(true); setTimeout(() => document.getElementById("new-module-input")?.focus(), 50) }}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "#6366f1", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
              >
                <Plus size={14} /> Créer un module
              </button>
            </div>
          )}

          {/* Module list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedModules.map((mod, modIdx) => {
              const modLessons = lessons.filter(l => l.moduleId === mod.id).sort((a, b) => a.order - b.order)
              const isExpanded = expandedModules.has(mod.id)
              const isEditingTitle = editingModuleId === mod.id

              return (
                <div key={mod.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #eef0f6", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                  {/* Module header */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", gap: 12, cursor: "pointer", transition: "background 0.12s", userSelect: "none" }}
                    onClick={() => setExpandedModules(p => {
                      const next = new Set(p)
                      next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id)
                      return next
                    })}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 800, color: "#6366f1" }}>
                      {modIdx + 1}
                    </div>
                    <ChevronDown size={15} style={{ flexShrink: 0, color: "#94a3b8", transition: "transform 0.2s", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />

                    {isEditingTitle ? (
                      <input
                        autoFocus
                        value={editingModuleTitle}
                        onChange={e => setEditingModuleTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveModuleTitle(mod.id); if (e.key === "Escape") setEditingModuleId(null) }}
                        onBlur={() => saveModuleTitle(mod.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, border: "1.5px solid #6366f1", borderRadius: 8, padding: "4px 10px", fontSize: 14, fontWeight: 700, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>{mod.title}</span>
                    )}

                    <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", flexShrink: 0 }}>
                      {modLessons.length} leçon{modLessons.length !== 1 ? "s" : ""}
                    </span>

                    {/* Module actions */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingModuleId(mod.id); setEditingModuleTitle(mod.title) }}
                        style={iconBtnSm}
                        title="Renommer"
                        onMouseEnter={e => (e.currentTarget.style.color = "#6366f1")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                      ><Pencil size={12} /></button>
                      <button
                        onClick={() => deleteModule(mod.id)}
                        style={iconBtnSm}
                        title="Supprimer"
                        onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                      ><Trash2 size={12} /></button>
                    </div>
                  </div>

                  {/* Module lessons */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #f1f5f9" }}>
                      {modLessons.length === 0 && addingLessonForModule !== mod.id && (
                        <div style={{ padding: "20px 24px", color: "#cbd5e1", fontSize: 13, textAlign: "center" }}>
                          Aucune leçon dans ce module.
                        </div>
                      )}

                      {modLessons.map(lesson => {
                        const isActive = selectedLessonId === lesson.id
                        const lessonVideos = videos.filter(v => v.lessonId === lesson.id)
                        const lessonFiles = lessonAttachments.filter(a => a.lessonId === lesson.id)

                        return (
                          <div key={lesson.id}>
                            {/* Lesson row */}
                            <div
                              style={{ display: "flex", alignItems: "center", padding: "11px 18px 11px 56px", gap: 10, cursor: "pointer", background: isActive ? "rgba(99,102,241,0.05)" : "transparent", borderBottom: isActive ? "none" : "1px solid #f8fafc", transition: "background 0.12s" }}
                              onClick={() => selectLesson(lesson)}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#fafbfd" }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent" }}
                            >
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? "#6366f1" : "#cbd5e1", flexShrink: 0, transition: "background 0.15s" }} />
                              <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "#4f46e5" : "#374151", transition: "all 0.15s" }}>
                                {lesson.title}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                {lessonVideos.length > 0 && (
                                  <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}>
                                    <Video size={10} /> {lessonVideos.length}
                                  </span>
                                )}
                                {lessonFiles.length > 0 && (
                                  <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}>
                                    <Paperclip size={10} /> {lessonFiles.length}
                                  </span>
                                )}
                                <button
                                  onClick={e => { e.stopPropagation(); deleteLesson(lesson.id) }}
                                  style={{ ...iconBtnSm, marginLeft: 4 }}
                                  title="Supprimer"
                                  onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                                ><Trash2 size={12} /></button>
                              </div>
                            </div>

                            {/* Inline lesson editor */}
                            {isActive && editingLesson && (
                              <div style={{ background: "#f8fafc", borderBottom: "1px solid #eef0f6", padding: "20px 24px" }}>

                                {/* Lesson title */}
                                <input
                                  value={editingLesson.title}
                                  onChange={e => { setEditingLesson(p => p ? { ...p, title: e.target.value } : null); setLessonDirty(true) }}
                                  style={{ width: "100%", fontSize: 20, fontWeight: 800, color: "#0f172a", border: "none", background: "transparent", outline: "none", fontFamily: "var(--ff-display,'Syne',sans-serif)", letterSpacing: "-0.03em", padding: "0 0 8px", lineHeight: 1.2, borderBottom: lessonDirty ? "2px solid #6366f1" : "2px solid #e2e8f0", transition: "border-color 0.3s", boxSizing: "border-box" }}
                                  placeholder="Titre de la leçon…"
                                />

                                {/* Tabs */}
                                <div style={{ display: "flex", gap: 4, margin: "16px 0", padding: "4px", background: "#eef0f6", borderRadius: 10, width: "fit-content" }}>
                                  {(["contenu", "videos", "fichiers"] as const).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                      style={{ padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                                        background: activeTab === tab ? "#fff" : "transparent",
                                        color: activeTab === tab ? "#4f46e5" : "#64748b",
                                        boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                      }}>
                                      {tab === "contenu" && "Contenu"}
                                      {tab === "videos" && `Vidéos${lessonVideos.length ? ` (${lessonVideos.length})` : ""}`}
                                      {tab === "fichiers" && `Fichiers${lessonFiles.length ? ` (${lessonFiles.length})` : ""}`}
                                    </button>
                                  ))}
                                </div>

                                {/* Tab: Contenu */}
                                {activeTab === "contenu" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eef0f6" }}>
                                      <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 7 }}>
                                        <FileText size={13} color="#6366f1" />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.02em" }}>Description</span>
                                      </div>
                                      <textarea
                                        value={editingLesson.description}
                                        onChange={e => { setEditingLesson(p => p ? { ...p, description: e.target.value } : null); setLessonDirty(true) }}
                                        placeholder="Brève description de la leçon…"
                                        rows={2}
                                        style={{ width: "100%", padding: "12px 16px", border: "none", outline: "none", resize: "vertical", fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "inherit", background: "transparent", boxSizing: "border-box" }}
                                      />
                                    </div>
                                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eef0f6" }}>
                                      <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 7 }}>
                                        <BookOpen size={13} color="#6366f1" />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.02em" }}>Contenu de la leçon</span>
                                      </div>
                                      <textarea
                                        value={editingLesson.content}
                                        onChange={e => { setEditingLesson(p => p ? { ...p, content: e.target.value } : null); setLessonDirty(true) }}
                                        placeholder="Écrivez le contenu détaillé de la leçon…"
                                        rows={10}
                                        style={{ width: "100%", padding: "12px 16px", border: "none", outline: "none", resize: "vertical", fontSize: 13, color: "#374151", lineHeight: 1.8, fontFamily: "inherit", background: "transparent", boxSizing: "border-box" }}
                                      />
                                    </div>
                                    {lessonDirty && (
                                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                                        <button onClick={() => { setEditingLesson(lessons.find(l => l.id === selectedLessonId) || null); setLessonDirty(false) }} style={ghostBtnStyle}>Annuler</button>
                                        <button onClick={() => saveLesson(editingLesson)} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}>
                                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                          Enregistrer
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Tab: Vidéos */}
                                {activeTab === "videos" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {lessonVideos.map(video => {
                                      const embedUrl = getDriveEmbedUrl(video.driveUrl)
                                      const isEditingV = editingVideoId === video.id
                                      const edits = videoEdits[video.id] || { title: video.title, driveUrl: video.driveUrl, description: video.description }
                                      const vAtts = videoAttachments.filter(a => a.videoId === video.id)

                                      return (
                                        <div key={video.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #eef0f6", overflow: "hidden" }}>
                                          {embedUrl && !isEditingV && (
                                            <div style={{ position: "relative", paddingTop: "40%", background: "#f1f5f9" }}>
                                              <iframe src={embedUrl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="autoplay" allowFullScreen />
                                            </div>
                                          )}
                                          <div style={{ padding: "14px 16px" }}>
                                            {isEditingV ? (
                                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                <div><label style={labelStyle}>Titre</label><StyledInput value={edits.title} onChange={v => setVideoEdits(p => ({ ...p, [video.id]: { ...edits, title: v } }))} placeholder="Titre" /></div>
                                                <div><label style={labelStyle}>Lien Drive</label><StyledInput value={edits.driveUrl} onChange={v => setVideoEdits(p => ({ ...p, [video.id]: { ...edits, driveUrl: v } }))} placeholder="https://drive.google.com/…" /></div>
                                                <div>
                                                  <label style={labelStyle}>Description</label>
                                                  <textarea value={edits.description} onChange={e => setVideoEdits(p => ({ ...p, [video.id]: { ...edits, description: e.target.value } }))} rows={2} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#374151", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                                                </div>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                  <button onClick={() => saveVideo(video.id)} style={primaryBtnStyle}><Save size={13} /> Enregistrer</button>
                                                  <button onClick={() => setEditingVideoId(null)} style={ghostBtnStyle}>Annuler</button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                                <div style={{ flex: 1 }}>
                                                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                                                    <Play size={13} color="#6366f1" />
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{video.title}</span>
                                                  </div>
                                                  {video.description && <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px", lineHeight: 1.6 }}>{video.description}</p>}
                                                  {video.driveUrl && (
                                                    <a href={video.driveUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                                                      <ExternalLink size={10} /> Ouvrir dans Drive
                                                    </a>
                                                  )}
                                                </div>
                                                <div style={{ display: "flex", gap: 4 }}>
                                                  <button onClick={() => { setEditingVideoId(video.id); setVideoEdits(p => ({ ...p, [video.id]: { title: video.title, driveUrl: video.driveUrl, description: video.description } })) }} style={iconBtnStyle}><Pencil size={12} /></button>
                                                  <button onClick={() => deleteVideo(video.id)} style={{ ...iconBtnStyle, color: "#ef4444" }}><Trash2 size={12} /></button>
                                                </div>
                                              </div>
                                            )}

                                            {/* Video file attachments */}
                                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>Fichiers ({vAtts.length})</span>
                                                <button onClick={() => { setUploadingFor({ type: "video", parentId: video.id }); videoFileInputRef.current?.click() }} style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 6, padding: "3px 9px", cursor: "pointer" }}>
                                                  <Upload size={9} style={{ display: "inline", marginRight: 4 }} />Ajouter
                                                </button>
                                              </div>
                                              {vAtts.length === 0 ? (
                                                <p style={{ fontSize: 12, color: "#cbd5e1", margin: 0 }}>Aucun fichier joint</p>
                                              ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                  {vAtts.map(att => <AttachmentRow key={att.id} att={att} onDelete={() => deleteAttachment("video_attachment", att.id)} />)}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* Add video */}
                                    {addingVideoForLesson === lesson.id ? (
                                      <div style={{ background: "#fff", borderRadius: 12, border: "1.5px dashed #c7d2fe", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                                        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Video size={13} /> Nouvelle vidéo</h3>
                                        <div><label style={labelStyle}>Titre</label><StyledInput value={newVideo.title} onChange={v => setNewVideo(p => ({ ...p, title: v }))} placeholder="Ex: Introduction au chapitre" /></div>
                                        <div><label style={labelStyle}>Lien Google Drive</label><StyledInput value={newVideo.driveUrl} onChange={v => setNewVideo(p => ({ ...p, driveUrl: v }))} placeholder="https://drive.google.com/file/d/…" /></div>
                                        <div>
                                          <label style={labelStyle}>Description <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(optionnelle)</span></label>
                                          <textarea value={newVideo.description} onChange={e => setNewVideo(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Résumé de la vidéo…" style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#374151", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                          <button onClick={() => createVideo(lesson.id)} style={primaryBtnStyle}><Plus size={13} /> Ajouter</button>
                                          <button onClick={() => { setAddingVideoForLesson(null); setNewVideo({ title: "", driveUrl: "", description: "" }) }} style={ghostBtnStyle}>Annuler</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={() => setAddingVideoForLesson(lesson.id)}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px", background: "transparent", border: "1.5px dashed #c7d2fe", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6366f1", transition: "all 0.15s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.03)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#818cf8" }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#c7d2fe" }}
                                      >
                                        <Video size={14} /> Ajouter une vidéo Drive
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Tab: Fichiers */}
                                {activeTab === "fichiers" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div
                                      onClick={() => { setUploadingFor({ type: "lesson", parentId: lesson.id }); fileInputRef.current?.click() }}
                                      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 20px", background: uploading ? "rgba(99,102,241,0.03)" : "#fff", border: `2px dashed ${uploading ? "#818cf8" : "#e2e8f0"}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#a5b4fc"; (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.02)" }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLDivElement).style.background = "#fff" }}
                                    >
                                      {uploading ? (
                                        <Loader2 size={24} color="#6366f1" className="animate-spin" />
                                      ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                          <Upload size={17} color="#6366f1" />
                                        </div>
                                      )}
                                      <div style={{ textAlign: "center" }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 2px" }}>{uploading ? "Upload en cours…" : "Déposer un fichier"}</p>
                                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>PDF, Word, Excel, images…</p>
                                      </div>
                                    </div>
                                    {lessonFiles.length > 0 && (
                                      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eef0f6", overflow: "hidden" }}>
                                        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
                                          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{lessonFiles.length} fichier{lessonFiles.length > 1 ? "s" : ""}</span>
                                        </div>
                                        <div style={{ padding: "4px 0" }}>
                                          {lessonFiles.map(att => <AttachmentRow key={att.id} att={att} onDelete={() => deleteAttachment("lesson_attachment", att.id)} />)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Add lesson inline */}
                      <div style={{ padding: "8px 18px 14px 56px" }}>
                        {addingLessonForModule === mod.id ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              autoFocus
                              value={newLessonTitle}
                              onChange={e => setNewLessonTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") createLesson(mod.id); if (e.key === "Escape") setAddingLessonForModule(null) }}
                              placeholder="Titre de la leçon…"
                              style={{ flex: 1, border: "1.5px solid #c7d2fe", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                            />
                            <button onClick={() => createLesson(mod.id)} style={{ padding: "7px 12px", background: "#6366f1", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}><Check size={13} /></button>
                            <button onClick={() => setAddingLessonForModule(null)} style={{ padding: "7px 10px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#94a3b8" }}><X size={13} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingLessonForModule(mod.id); setNewLessonTitle("") }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#6366f1", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.06)" }}
                          >
                            <Plus size={11} /> Ajouter une leçon
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Hidden file inputs ── */}
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileUpload} />
      <input ref={videoFileInputRef} type="file" style={{ display: "none" }} onChange={handleFileUpload} />

      {/* ── Toasts ── */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
            borderRadius: 12, fontSize: 13, fontWeight: 600, pointerEvents: "auto",
            background: t.type === "ok" ? "#fff" : "#fff",
            color: t.type === "ok" ? "#16a34a" : "#dc2626",
            border: t.type === "ok" ? "1px solid #bbf7d0" : "1px solid #fecaca",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}>
            {t.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Shared small components ────────────────────────────────────────────────────

function StyledInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
      onFocus={e => (e.target.style.borderColor = "#6366f1")}
      onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
    />
  )
}

function AttachmentRow({ att, onDelete }: { att: Attachment; onDelete: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 16px", background: hover ? "#fafbfd" : "transparent", transition: "background 0.12s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{getFileIcon(att.name)}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
      {att.url && (
        <a href={att.url} target="_blank" rel="noopener noreferrer" download
          style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(99,102,241,0.07)", color: "#6366f1", fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
          ↓
        </a>
      )}
      <button onClick={onDelete}
        style={{ padding: "4px 6px", background: "transparent", border: "none", cursor: "pointer", color: "#cbd5e1", borderRadius: 6, transition: "all 0.12s", flexShrink: 0 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}>
        <X size={12} />
      </button>
    </div>
  )
}

// ── Style constants ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
  marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase",
}

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", background: "linear-gradient(135deg,#6366f1,#818cf8)",
  border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff",
  cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
}

const ghostBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", background: "#fff",
  border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#64748b",
  cursor: "pointer",
}

const iconBtnStyle: React.CSSProperties = {
  padding: "5px 7px", background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: 7, cursor: "pointer", color: "#64748b", display: "inline-flex", alignItems: "center",
}

const iconBtnSm: React.CSSProperties = {
  padding: "4px 6px", background: "transparent", border: "none",
  borderRadius: 6, cursor: "pointer", color: "#94a3b8", display: "inline-flex", alignItems: "center",
  transition: "color 0.15s",
}
