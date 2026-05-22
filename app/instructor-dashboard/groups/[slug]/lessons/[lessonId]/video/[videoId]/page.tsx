"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ChevronRight, Loader2 } from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ──────────────────────────────────────────────────────────────────────

type Lesson     = { id: string; title: string; description: string; content: string; order: number; moduleId: string }
type Module     = { id: string; title: string; order: number }
type VideoItem  = { id: string; lessonId: string; title: string; driveUrl: string; description: string; order?: number }

type PageData = {
  lesson: Lesson
  module: Module | null
  moduleIndex: number
  lessonIndex: number
  groupId: string
  groupTitle: string
  instructor: { name: string; surname: string } | null
  videos: VideoItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDriveEmbedUrl(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  return null
}

function getDriveThumbnailUrl(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w600`
  return null
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VideoPage() {
  const { slug, lessonId, videoId } = useParams<{ slug: string; lessonId: string; videoId: string }>()
  const router = useRouter()

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug || !lessonId || !videoId) return
    setLoading(true)
    fetch(`/api/instructor/groups/${slug}/lessons/${lessonId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, lessonId, videoId])

  // ── Render Helpers ───────────────────────────────────────────────────────────

  if (loading) return <LoadingBI />

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "#6b7280" }}>Données introuvables</p>
      </div>
    )
  }

  const { lesson, groupTitle, videos } = data
  const video = videos.find(v => v.id === videoId)

  if (!video) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 10 }}>
        <p style={{ color: "#6b7280", fontWeight: 600 }}>Vidéo introuvable</p>
        <Link href={`/instructor-dashboard/groups/${slug}/lessons/${lessonId}`} style={{ color: "var(--accent)", fontSize: 14 }}>
          Retour à la leçon
        </Link>
      </div>
    )
  }

  const embedUrl = getDriveEmbedUrl(video.driveUrl)
  const displayIndex = (video.order || 0) + 1

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", fontFamily: "inherit" }}>
      
      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff",
        borderBottom: "1px solid #f1f5f9",
        padding: "14px 28px 0",
        display: "flex", flexDirection: "column",
      }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/instructor-dashboard/overview" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Accueil</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href="/instructor-dashboard/groups" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Formations</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href={`/instructor-dashboard/groups/${slug}`} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {groupTitle || slug}
            </Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href={`/instructor-dashboard/groups/${slug}/lessons/${lessonId}`} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lesson.title || "Leçon"}
            </Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {video.title || "Vidéo"}
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginTop: 8, paddingBottom: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
            Vidéo {displayIndex} : {video.title}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Au sein de la leçon "{lesson.title}"
          </p>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ padding: "24px 28px 64px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "start" }}>
        
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          
          <div style={{ width: "90%", position: "relative", aspectRatio: "16/9", background: "#f0f1f5", borderRadius: 12, border: "1px solid #e8ecf3", overflow: "hidden" }}>
            {embedUrl ? (
                <iframe src={embedUrl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="autoplay" allowFullScreen />
            ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <span style={{ fontSize: 14, color: "#9ca3af", fontWeight: 600 }}>Lien Google Drive manquant ou invalide</span>
                </div>
            )}
          </div>
          
          <div style={{ width: "90%", padding: "8px 0" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "0 0 10px", fontFamily: "var(--ff-display,'Syne',sans-serif)", letterSpacing: "-0.02em" }}>
              {video.title}
            </h2>
            {video.description && (
              <p style={{ 
                fontSize: 15, color: "#4b5563", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap"
              }}>
                {video.description}
              </p>
            )}
            {!video.description && (
              <p style={{ fontSize: 14, color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
                Aucune description fournie pour cette vidéo.
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 104, alignSelf: "start" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
             <h3 style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
               Vidéos de la leçon
             </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[...videos].sort((a,b) => (a.order||0) - (b.order||0)).map((v, idx) => {
              const isCurrent = v.id === videoId
              const num = String(idx + 1).padStart(2, "0")
              const thumbnailUrl = getDriveThumbnailUrl(v.driveUrl)
              
              return (
                <Link
                  key={v.id}
                  href={`/instructor-dashboard/groups/${slug}/lessons/${lessonId}/video/${v.id}`}
                  style={{
                    display: "flex", flexDirection: "column", gap: 10,
                    textDecoration: "none", cursor: "pointer"
                  }}
                >
                  <div style={{ 
                    position: "relative", aspectRatio: "16/9", background: "#f0f1f5", borderRadius: 10, overflow: "hidden",
                    border: isCurrent ? "2px solid var(--accent)" : "1px solid #e8ecf3",
                    boxShadow: isCurrent ? "0 4px 12px color-mix(in oklch, var(--accent) 20%, transparent)" : "0 2px 6px rgba(0,0,0,0.03)",
                    transition: "all 0.15s"
                  }}>
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Aperçu</span>
                      </div>
                    )}
                    {isCurrent && (
                      <div style={{ position: "absolute", bottom: 8, right: 8, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 6px", borderRadius: 4, letterSpacing: "0.05em" }}>
                        EN LECTURE
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "0 4px" }}>
                    <h4 style={{ 
                      fontSize: 14, fontWeight: 800, color: isCurrent ? "var(--accent)" : "#111827", margin: "0 0 4px",
                      display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3
                    }}>
                      {num}. {v.title}
                    </h4>
                    {v.description ? (
                      <p style={{ 
                        fontSize: 12, color: "#6b7280", margin: 0, 
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 
                      }}>
                        {v.description}
                      </p>
                    ) : (
                      <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", margin: 0 }}>Aucune description</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

        </div>

      </div>
    </div>
  )
}
