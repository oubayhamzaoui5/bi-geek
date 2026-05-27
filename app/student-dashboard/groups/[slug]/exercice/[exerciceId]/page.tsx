"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, ClipboardCheck, AlertCircle, ExternalLink,
  FileText, FileSpreadsheet, Archive, Film, ImageIcon, Paperclip,
  Upload, X, Check, Lock, Clock, Loader2, Send,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ─────────────────────────────────────────────────────────────────────

type Attachment = { id: string; name: string; url: string | null }
type Exercise   = { id: string; title: string; description: string; deadline: string | null; attachments: Attachment[] }
type SubmissionFile = { id: string; name: string; url: string | null }
type Submission = { id: string; submittedAt: string; files: SubmissionFile[] }
type PendingFile = { id: string; file: File; name: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) }

function getFileMeta(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return { color: "#7c3aed", bg: "#f5f3ff", label: "VID", icon: Film }
  if (ext === "pdf")                               return { color: "#dc2626", bg: "#fef2f2", label: "PDF", icon: FileText }
  if (["doc", "docx"].includes(ext))              return { color: "#2563eb", bg: "#eff6ff", label: ext.toUpperCase(), icon: FileText }
  if (["xls", "xlsx"].includes(ext))              return { color: "#16a34a", bg: "#f0fdf4", label: ext.toUpperCase(), icon: FileSpreadsheet }
  if (["zip", "rar", "7z"].includes(ext))         return { color: "#d97706", bg: "#fffbeb", label: "ZIP", icon: Archive }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return { color: "#0891b2", bg: "#ecfeff", label: "IMG", icon: ImageIcon }
  return { color: "#6b7280", bg: "#f4f6fb", label: (ext || "FILE").toUpperCase(), icon: Paperclip }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function getStudentId() {
  try {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    const id = u?.id ?? u?.record?.id ?? u?.user?.id ?? ""
    return typeof id === "string" ? id.trim() : ""
  } catch { return "" }
}

type Toast = { type: "ok" | "err"; msg: string }
function useToast() {
  const [toasts, setToasts] = useState<(Toast & { id: number })[]>([])
  const push = (type: Toast["type"], msg: string) => {
    const id = Date.now()
    setToasts(p => [...p, { type, msg, id }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }
  return { toasts, push }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentExercicePage() {
  const { slug, exerciceId } = useParams<{ slug: string; exerciceId: string }>()
  const router = useRouter()
  const { toasts, push } = useToast()

  const [exercise, setExercise]   = useState<Exercise | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [dragging, setDragging]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const studentId = getStudentId()

  useEffect(() => {
    if (!exerciceId || !slug) return
    const load = async () => {
      try {
        const [exRes, subRes] = await Promise.all([
          fetch(`/api/student/groups/${slug}/exercice?exerciceId=${exerciceId}`).then(r => r.json()),
          studentId
            ? fetch(`/api/student/groups/${slug}/exercice/${exerciceId}/submit?studentId=${studentId}`).then(r => r.json())
            : Promise.resolve({ ok: true, submission: null }),
        ])
        if (exRes.ok) setExercise(exRes.exercise)
        else setError(exRes.error || "Exercice introuvable")
        if (subRes.ok && subRes.submission) setSubmission(subRes.submission)
      } catch {
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [exerciceId, slug, studentId])

  function addFiles(fl: FileList | null) {
    if (!fl) return
    setPendingFiles(p => [...p, ...Array.from(fl).map(f => ({ id: uid(), file: f, name: f.name }))])
  }

  async function handleSubmit() {
    if (!studentId) { push("err", "Connexion requise"); return }
    if (pendingFiles.length === 0) { push("err", "Ajoutez au moins un fichier"); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("studentId", studentId)
      pendingFiles.forEach(pf => fd.append("files", pf.file, pf.name))
      const res = await fetch(`/api/student/groups/${slug}/exercice/${exerciceId}/submit`, { method: "POST", body: fd })
      const d = await res.json()
      if (!d.ok) throw new Error(d.error || "Erreur serveur")
      setSubmission(d.submission)
      setPendingFiles([])
      push("ok", "Exercice soumis !")
    } catch (e: any) {
      push("err", e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingBI />

  if (error || !exercise) {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
          <p style={{ color: "#64748b" }}>{error || "Exercice introuvable"}</p>
          <button onClick={() => router.back()} style={{ marginTop: 12, padding: "8px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Retour</button>
        </div>
      </div>
    )
  }

  const deadlinePassed = exercise.deadline ? new Date(exercise.deadline) < new Date() : false
  const canSubmit = !submission && !deadlinePassed

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc", fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #e8ecf3", background: "#fff", flexShrink: 0 }}>
            <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardCheck size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exercise.title}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{exercise.attachments.length} pièce{exercise.attachments.length !== 1 ? "s" : ""} jointe{exercise.attachments.length !== 1 ? "s" : ""}</div>
            </div>
            {exercise.deadline && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 99, background: deadlinePassed ? "#fef2f2" : "#fffbeb", border: `1px solid ${deadlinePassed ? "#fecaca" : "#fde68a"}`, flexShrink: 0 }}>
                <Clock size={12} color={deadlinePassed ? "#dc2626" : "#d97706"} />
                <span style={{ fontSize: 11, fontWeight: 700, color: deadlinePassed ? "#dc2626" : "#d97706" }}>
                  {deadlinePassed ? "Délai dépassé" : fmtDate(exercise.deadline)}
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Description */}
              {exercise.description && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Consignes</div>
                  <p style={{ fontSize: 15, color: "#1e293b", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{exercise.description}</p>
                </div>
              )}

              {/* Instructor attachments */}
              {exercise.attachments.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pièces jointes</div>
                    <span style={{ fontSize: 11, color: "color-mix(in oklch, var(--accent) 85%, black)", fontWeight: 700, background: "color-mix(in oklch, var(--accent) 8%, transparent)", padding: "3px 10px", borderRadius: 99, border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)" }}>
                      {exercise.attachments.length} fichier{exercise.attachments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {exercise.attachments.map(att => {
                      const meta = getFileMeta(att.name)
                      const Icon = meta.icon
                      return (
                        <a
                          key={att.id}
                          href={att.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 12, border: "1px solid #e8ecf3", background: "#f8fafc", textDecoration: "none", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#fff"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#f8fafc"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e8ecf3"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none" }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={18} color={meta.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                            <div style={{ fontSize: 11, color: meta.color, fontWeight: 700, marginTop: 2 }}>{meta.label}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Télécharger</span>
                            <ExternalLink size={13} color="var(--accent)" />
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Submitted: locked view ── */}
              {submission && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #86efac", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in oklch, var(--accent) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={18} color="var(--accent)" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "color-mix(in oklch, var(--accent) 85%, black)" }}>Exercice soumis</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Le {fmtDate(submission.submittedAt)} · {submission.files.length} fichier{submission.files.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 99, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <Lock size={11} color="#64748b" />
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Verrouillé</span>
                    </div>
                  </div>
                  {submission.files.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {submission.files.map(file => {
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
                </div>
              )}

              {/* ── Deadline expired, not submitted ── */}
              {!submission && deadlinePassed && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #fecaca", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Lock size={20} color="#dc2626" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>Soumission fermée</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                      La date limite était le {fmtDate(exercise.deadline!)}. Vous ne pouvez plus soumettre cet exercice.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Submission form ── */}
              {canSubmit && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Rendre votre travail</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Joignez vos fichiers et soumettez une seule fois</div>
                    </div>
                    {exercise.deadline && (
                      <span style={{ fontSize: 11, color: "#d97706", fontWeight: 700, background: "#fffbeb", padding: "3px 10px", borderRadius: 99, border: "1px solid #fde68a" }}>
                        Avant le {fmtDate(exercise.deadline)}
                      </span>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: dragging ? "2px dashed var(--accent)" : "2px dashed color-mix(in oklch, var(--accent) 28%, #e2e8f0)", borderRadius: 14, padding: "28px 24px", textAlign: "center", cursor: "pointer", background: dragging ? "color-mix(in oklch, var(--accent) 4%, transparent)" : "#f8fafc", transition: "all 0.2s", marginBottom: pendingFiles.length > 0 ? 14 : 0 }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                      <Upload size={18} color="#fff" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Glissez vos fichiers ici</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>ou <span style={{ color: "var(--accent)", fontWeight: 600 }}>cliquez pour parcourir</span></div>
                  </div>
                  <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />

                  {/* Pending files */}
                  {pendingFiles.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {pendingFiles.map(pf => {
                        const meta = getFileMeta(pf.name)
                        const Icon = meta.icon
                        return (
                          <div key={pf.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: "1px dashed color-mix(in oklch, var(--accent) 28%, #e2e8f0)", background: "color-mix(in oklch, var(--accent) 6%, transparent)" }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Icon size={16} color={meta.color} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pf.name}</div>
                              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>{formatBytes(pf.file.size)}</div>
                            </div>
                            <button
                              onClick={() => setPendingFiles(p => p.filter(f => f.id !== pf.id))}
                              style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#cbd5e1" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || pendingFiles.length === 0}
                    style={{ width: "100%", padding: "13px 0", background: pendingFiles.length === 0 ? "#f1f5f9" : "var(--accent)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, color: pendingFiles.length === 0 ? "#94a3b8" : "#fff", cursor: submitting || pendingFiles.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s", boxShadow: pendingFiles.length === 0 ? "none" : "0 2px 8px color-mix(in oklch, var(--accent) 28%, transparent)" }}
                  >
                    {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
                    {submitting ? "Soumission en cours…" : "Soumettre l'exercice"}
                  </button>
                  <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: "10px 0 0", lineHeight: 1.5 }}>
                    Une fois soumis, vous ne pourrez plus modifier votre travail.
                  </p>
                </div>
              )}

            </div>
          </div>
      </div>

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: "10px 16px", borderRadius: 10, background: t.type === "ok" ? "#0f172a" : "#fef2f2", color: t.type === "ok" ? "#fff" : "#dc2626", border: t.type === "err" ? "1px solid #fecaca" : "none", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
            {t.type === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
