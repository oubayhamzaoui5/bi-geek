"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, ClipboardCheck, AlertCircle, Users, ExternalLink,
  FileText, FileSpreadsheet, Archive, Film, ImageIcon, Paperclip,
  Clock, ChevronDown, ChevronRight,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ─────────────────────────────────────────────────────────────────────

type SubmissionFile = { id: string; name: string; url: string | null }
type Student = { id: string; name: string; surname: string; email: string; avatar: string | null } | null
type Submission = {
  id: string
  studentId: string
  student: Student
  submittedAt: string
  files: SubmissionFile[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFileMeta(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return { color: "#7c3aed", bg: "#f5f3ff", icon: Film }
  if (ext === "pdf")                               return { color: "#dc2626", bg: "#fef2f2", icon: FileText }
  if (["doc", "docx"].includes(ext))              return { color: "#2563eb", bg: "#eff6ff", icon: FileText }
  if (["xls", "xlsx"].includes(ext))              return { color: "#16a34a", bg: "#f0fdf4", icon: FileSpreadsheet }
  if (["zip", "rar", "7z"].includes(ext))         return { color: "#d97706", bg: "#fffbeb", icon: Archive }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return { color: "#0891b2", bg: "#ecfeff", icon: ImageIcon }
  return { color: "#6b7280", bg: "#f4f6fb", icon: Paperclip }
}

function initials(name: string, surname: string) {
  return ((name[0] || "") + (surname[0] || "")).toUpperCase() || "?"
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const { slug, exerciceId } = useParams<{ slug: string; exerciceId: string }>()
  const router = useRouter()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!exerciceId || !slug) return
    fetch(`/api/instructor/groups/${slug}/exercice/${exerciceId}/submissions`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setSubmissions(d.submissions || [])
        else setError(d.error || "Erreur")
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [exerciceId, slug])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return <LoadingBI />

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc", fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #e8ecf3", background: "#fff", flexShrink: 0 }}>
            <button
              onClick={() => router.back()}
              style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardCheck size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Soumissions</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {submissions.length} soumission{submissions.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 20 }}>
                  <AlertCircle size={16} color="#dc2626" />
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
                </div>
              )}

              {submissions.length === 0 && !error && (
                <div style={{ background: "#fff", borderRadius: 20, border: "1px dashed #e2e8f0", padding: "64px 24px", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Users size={24} color="#cbd5e1" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Aucune soumission</div>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Les étudiants n'ont pas encore rendu cet exercice.</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {submissions.map(sub => {
                  const isOpen = expanded.has(sub.id)
                  const s = sub.student
                  const displayName = s ? `${s.name} ${s.surname}`.trim() || s.email : sub.studentId
                  const avatarBg = s ? ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"][displayName.charCodeAt(0) % 5] : "#94a3b8"

                  return (
                    <div
                      key={sub.id}
                      style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}
                    >
                      {/* Row */}
                      <div
                        onClick={() => toggleExpand(sub.id)}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
                      >
                        {/* Avatar */}
                        {s?.avatar ? (
                          <img src={s.avatar} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                            {s ? initials(s.name, s.surname) : "?"}
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{displayName}</div>
                          {s?.email && (
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{s.email}</div>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <Clock size={12} color="#94a3b8" />
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{fmtDate(sub.submittedAt)}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "color-mix(in oklch, var(--accent) 85%, black)", fontWeight: 700, background: "color-mix(in oklch, var(--accent) 8%, transparent)", padding: "3px 10px", borderRadius: 99, border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)" }}>
                            {sub.files.length} fichier{sub.files.length !== 1 ? "s" : ""}
                          </span>
                          {isOpen ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                        </div>
                      </div>

                      {/* Files expanded */}
                      {isOpen && sub.files.length > 0 && (
                        <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {sub.files.map(file => {
                            const meta = getFileMeta(file.name)
                            const Icon = meta.icon
                            return (
                              <a
                                key={file.id}
                                href={file.url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11, border: "1px solid #e8ecf3", background: "#f8fafc", textDecoration: "none", transition: "all 0.15s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "#fff" }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e8ecf3"; (e.currentTarget as HTMLAnchorElement).style.background = "#f8fafc" }}
                              >
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <Icon size={16} color={meta.color} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                                </div>
                                <ExternalLink size={13} color="var(--accent)" />
                              </a>
                            )
                          })}
                        </div>
                      )}

                      {isOpen && sub.files.length === 0 && (
                        <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 20px", fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                          Aucun fichier joint
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
      </div>
    </div>
  )
}
