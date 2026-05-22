"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  ChevronRight, Video, Paperclip, Loader2,
  FileText, FileSpreadsheet, Archive, Film, ExternalLink, BookOpen, ArrowLeft,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ──────────────────────────────────────────────────────────────────────

type Lesson        = { id: string; title: string; description: string; content: string; order: number; moduleId: string }
type Module        = { id: string; title: string; order: number }
type VideoItem     = { id: string; lessonId: string; title: string; driveUrl: string; description: string; order?: number }
type Attachment    = { id: string; lessonId?: string; videoId?: string; name: string; url: string | null }
type LessonSummary = { id: string; title: string; order: number; moduleId?: string }

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

function getFileMeta(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["mp4","mov","avi","mkv"].includes(ext)) return { icon: <Film size={20} color="#7c3aed" />, bg: "#f5f3ff", label: ext.toUpperCase() }
  if (ext === "pdf")                            return { icon: <FileText size={20} color="#dc2626" />, bg: "#fef2f2", label: "PDF" }
  if (["doc","docx"].includes(ext))             return { icon: <FileText size={20} color="#2563eb" />, bg: "#eff6ff", label: ext.toUpperCase() }
  if (["xls","xlsx"].includes(ext))             return { icon: <FileSpreadsheet size={20} color="#16a34a" />, bg: "#f0fdf4", label: ext.toUpperCase() }
  if (["zip","rar","7z"].includes(ext))         return { icon: <Archive size={20} color="#d97706" />, bg: "#fffbeb", label: ext.toUpperCase() }
  return { icon: <Paperclip size={20} color="#6b7280" />, bg: "#f4f6fb", label: ext.toUpperCase() || "FILE" }
}

// ── Main page ──────────────────────────────────────────────────────────────────

function isPdf(name: string) { return name.split(".").pop()?.toLowerCase() === "pdf" }

export default function StudentLessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>()
  const router = useRouter()

  const [data,    setData]    = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!slug || !lessonId) return
    setLoading(true)
    fetch(`/api/student/groups/${slug}/lessons/${lessonId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        setData(d)
        if (d.lesson?.moduleId) setExpandedModules(new Set([d.lesson.moduleId]))
      })
      .finally(() => setLoading(false))
  }, [slug, lessonId])

  if (loading) return <LoadingBI />

  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fafafa" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Leçon introuvable</p>
        <Link href={`/student-dashboard/groups/${slug}`} style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>← Retour au groupe</Link>
      </div>
    </div>
  )

  const { lesson, module, moduleIndex, lessonIndex, groupTitle, instructor, videos, lessonAttachments } = data
  const modulePad = String(moduleIndex).padStart(2, "0")
  const lessonPad = String(lessonIndex).padStart(2, "0")
  const sortedVideos = [...videos].sort((a, b) => (a.order || 0) - (b.order || 0))

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>

      {/* ── Header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "14px 28px 0", display: "flex", flexDirection: "column" }}>
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
              <Link href="/student-dashboard" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Accueil</Link>
              <ChevronRight size={11} style={{ color: "#9ca3af" }} />
              <Link href="/student-dashboard/groups" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Formations</Link>
              <ChevronRight size={11} style={{ color: "#9ca3af" }} />
              <Link href={`/student-dashboard/groups/${slug}`} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {groupTitle || slug}
              </Link>
              <ChevronRight size={11} style={{ color: "#9ca3af" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lesson.title || "Leçon"}
              </span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, paddingBottom: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
            {lesson.title || "Leçon"}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0" }}>
            {module?.title || "Module"} · Leçon {lessonPad}
          </p>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ padding: "24px 28px 64px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        {/* ══ LEFT ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Lesson info card */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 2, borderRadius: 99, background: "var(--accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
                Module {modulePad} · Leçon {lessonPad}
              </span>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: "0 0 10px", letterSpacing: "-0.02em", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
              {lesson.title}
            </h2>
            {lesson.description && (
              <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.7 }}>{lesson.description}</p>
            )}
          </div>

          {/* ── Fichiers ── */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
              <Paperclip size={14} color="#6b7280" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Fichiers</span>
              {lessonAttachments.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f1f5f9", borderRadius: 99, padding: "2px 8px" }}>
                  {lessonAttachments.length}
                </span>
              )}
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {lessonAttachments.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "4px 0", margin: 0 }}>Aucun fichier pour cette leçon</p>
              ) : lessonAttachments.map(att => {
                const meta   = getFileMeta(att.name)
                const pdfUrl = att.url && isPdf(att.name)
                  ? `/student-dashboard/groups/${slug}/pdf-viewer?url=${encodeURIComponent(att.url)}&name=${encodeURIComponent(att.name)}&groupTitle=${encodeURIComponent(data?.groupTitle || "")}&lessonTitle=${encodeURIComponent(lesson.title)}&lessonId=${lessonId}&attachmentId=${att.id}`
                  : null
                return (
                  <div key={att.id}
                    onClick={() => { if (pdfUrl) router.push(pdfUrl) }}
                    style={{ display: "flex", alignItems: "center", gap: 0, borderRadius: 8, transition: "background 0.12s", cursor: pdfUrl ? "pointer" : "default" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f1f5f9"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, padding: "14px 16px" }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
                        {att.name}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", margin: "4px 0 0", letterSpacing: "0.04em" }}>{meta.label}</p>
                    </div>
                    {att.url && !pdfUrl && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#9ca3af", textDecoration: "none", transition: "all 0.12s", marginRight: 16, flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#e8ecf3"; (e.currentTarget as HTMLAnchorElement).style.color = "#374151" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af" }}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Vidéos ── */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
              <Video size={14} color="#6b7280" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Vidéos</span>
              {sortedVideos.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f1f5f9", borderRadius: 99, padding: "2px 8px" }}>
                  {sortedVideos.length}
                </span>
              )}
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {sortedVideos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "4px 0", margin: 0 }}>Aucune vidéo pour cette leçon</p>
              ) : sortedVideos.map((video, idx) => {
                const thumb = getDriveThumbnailUrl(video.driveUrl)
                const vidViewerUrl = video.driveUrl ? `/student-dashboard/groups/${slug}/video-viewer?url=${encodeURIComponent(video.driveUrl)}&title=${encodeURIComponent(video.title)}&groupTitle=${encodeURIComponent(data?.groupTitle || "")}&lessonTitle=${encodeURIComponent(lesson.title)}&lessonId=${lessonId}` : null

                return (
                  <div key={video.id} onClick={() => { if (vidViewerUrl) router.push(vidViewerUrl) }} style={{ display: "flex", alignItems: "center", gap: 0, textDecoration: "none", borderRadius: 8, overflow: "hidden", cursor: vidViewerUrl ? "pointer" : "default" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f1f5f9"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: 200, aspectRatio: "16/9", background: "#e8ecf3", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {thumb
                        ? <img src={thumb} alt={video.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Video size={24} color="#9ca3af" strokeWidth={1.5} />
                      }
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, padding: "18px 20px" }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
                        {idx + 1}. {video.title}
                      </p>
                      {video.description && (
                        <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {video.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
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
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{[instructor.name, instructor.surname].filter(Boolean).join(" ")}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0" }}>Formateur</p>
                </div>
              </div>
            </div>
          )}

          {/* Programme nav */}
          {data.allModules.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Programme</span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{data.allModules.length} module{data.allModules.length !== 1 ? "s" : ""}</span>
                <span style={{ color: "#e2e8f0", fontSize: 11 }}>·</span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{data.allLessons.length} leçon{data.allLessons.length !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ padding: "6px 0 6px" }}>
                {data.allModules.map((mod, modIdx) => {
                  const modLessons = data.allLessons.filter(l => l.moduleId === mod.id)
                  const isExpanded = expandedModules.has(mod.id)
                  const num = String(modIdx + 1).padStart(2, "0")
                  const hasCurrentLesson = modLessons.some(l => l.id === lesson.id)
                  return (
                    <div key={mod.id}>
                      <div
                        onClick={() => setExpandedModules(prev => { const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s })}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", cursor: "pointer", transition: "background 0.12s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${hasCurrentLesson ? "var(--accent)" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 800, color: hasCurrentLesson ? "var(--accent)" : "#9ca3af" }}>
                          {num}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.title}</span>
                        <span style={{ fontSize: 10, color: "#b0b7c8", fontWeight: 500, flexShrink: 0 }}>{modLessons.length}</span>
                        <ChevronRight size={12} color="#d1d5db" style={{ flexShrink: 0, transition: "transform 0.18s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }} />
                      </div>
                      {isExpanded && modLessons.map((l, lIdx) => {
                        const isCurrent = l.id === lesson.id
                        return (
                          <div key={l.id}
                            onClick={() => router.push(`/student-dashboard/groups/${slug}/lessons/${l.id}`)}
                            style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 18px 7px 54px", background: isCurrent ? "color-mix(in oklch, var(--accent) 7%, transparent)" : "transparent", cursor: "pointer", transition: "background 0.12s", borderLeft: isCurrent ? "2px solid var(--accent)" : "2px solid transparent" }}
                            onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                            onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? "var(--accent)" : "#c4c9d4", minWidth: 16, flexShrink: 0 }}>{String(lIdx + 1).padStart(2, "0")}</span>
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
