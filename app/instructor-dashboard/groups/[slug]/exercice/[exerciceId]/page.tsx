"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Check, Loader2, AlertCircle, Upload, X, Save,
  FileText, FileSpreadsheet, Archive, Film, ImageIcon,
  Paperclip, ClipboardCheck, ExternalLink,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ─────────────────────────────────────────────────────────────────────

type SavedAttachment = { id: string; name: string; url: string | null }
type PendingFile = { id: string; file: File; name: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) }

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
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

export default function EditExercicePage() {
  const { slug, exerciceId } = useParams<{ slug: string; exerciceId: string }>()
  const router = useRouter()
  const { toasts, push } = useToast()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [savedAttachments, setSavedAttachments] = useState<SavedAttachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [deletingAtt, setDeletingAtt] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!exerciceId || !slug) return
    const load = async () => {
      try {
        const res = await fetch(`/api/instructor/groups/${slug}/exercice?exerciceId=${exerciceId}`)
        const d = await res.json()
        if (!d.ok) throw new Error(d.error)
        setTitle(d.exercise.title)
        setDescription(d.exercise.description)
        if (d.exercise.deadline) {
          const dt = new Date(d.exercise.deadline)
          setDeadline(dt.toISOString().slice(0, 16))
        }
        setSavedAttachments(d.exercise.attachments || [])
      } catch (e: any) {
        push("err", e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [exerciceId, slug])

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    setPendingFiles(p => [...p, ...Array.from(incoming).map(f => ({ id: uid(), file: f, name: f.name }))])
  }

  async function deleteSavedAttachment(attId: string) {
    setDeletingAtt(attId)
    try {
      const res = await fetch(`/api/instructor/groups/${slug}/exercice/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSavedAttachments(p => p.filter(a => a.id !== attId))
      push("ok", "Fichier supprimé")
    } catch (e: any) {
      push("err", e.message)
    } finally {
      setDeletingAtt(null)
    }
  }

  async function handleSave() {
    if (!title.trim()) { push("err", "Titre requis"); return }
    setSaving(true)
    try {
      // Update title/description
      const res = await fetch(`/api/instructor/groups/${slug}/exercice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: exerciceId, title: title.trim(), description: description.trim(), deadline: deadline ? new Date(deadline).toISOString() : null }),
      })
      if (!res.ok) throw new Error((await res.json()).error)

      // Upload pending files
      for (const pf of pendingFiles) {
        const fd = new FormData()
        fd.append("exerciceId", exerciceId)
        fd.append("name", pf.name)
        fd.append("file", pf.file)
        const r = await fetch(`/api/instructor/groups/${slug}/exercice/attachments`, { method: "POST", body: fd })
        const d = await r.json()
        if (d.ok) setSavedAttachments(p => [...p, d.attachment])
      }
      setPendingFiles([])
      push("ok", "Exercice mis à jour")
    } catch (e: any) {
      push("err", e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingBI />

  const totalFiles = savedAttachments.length + pendingFiles.length

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc", fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          <div style={{ padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e8ecf3", background: "#fff", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
                <ArrowLeft size={16} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardCheck size={16} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{title || "Exercice"}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{totalFiles} fichier{totalFiles !== 1 ? "s" : ""} joint{totalFiles !== 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: saving ? "none" : "0 2px 8px color-mix(in oklch, var(--accent) 28%, transparent)" }}
            >
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                  Titre <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                />
              </div>

              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                  Description & consignes
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={7}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, color: "#0f172a", fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.7, boxSizing: "border-box" }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                />
              </div>

              {/* Deadline */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                  Date limite <span style={{ fontWeight: 400, color: "#94a3b8", textTransform: "none", fontSize: 11 }}>(optionnel)</span>
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                />
              </div>

              {/* Submissions link */}
              <a
                href={`/instructor-dashboard/groups/${slug}/exercice/${exerciceId}/submissions`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e8ecf3"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Voir les soumissions</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Consulter les travaux rendus par les étudiants</div>
                </div>
                <ExternalLink size={16} color="var(--accent)" />
              </a>

              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pièces jointes</label>
                  {totalFiles > 0 && (
                    <span style={{ fontSize: 11, color: "color-mix(in oklch, var(--accent) 85%, black)", fontWeight: 700, background: "color-mix(in oklch, var(--accent) 8%, transparent)", padding: "3px 10px", borderRadius: 99, border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)" }}>
                      {totalFiles} fichier{totalFiles !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: dragging ? "2px dashed var(--accent)" : "2px dashed color-mix(in oklch, var(--accent) 28%, #e2e8f0)", borderRadius: 14, padding: "24px", textAlign: "center", cursor: "pointer", background: dragging ? "color-mix(in oklch, var(--accent) 4%, transparent)" : "#f8fafc", transition: "all 0.2s", marginBottom: totalFiles > 0 ? 16 : 0 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#64748b" }}>
                    <Upload size={16} color="var(--accent)" />
                    <span>Glissez ou <span style={{ color: "var(--accent)" }}>parcourez</span> vos fichiers</span>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />

                {(savedAttachments.length > 0 || pendingFiles.length > 0) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {savedAttachments.map(att => {
                      const meta = getFileMeta(att.name)
                      const Icon = meta.icon
                      return (
                        <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #e8ecf3", background: "#f8fafc" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={16} color={meta.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Enregistré</div>
                          </div>
                          {att.url && (
                            <a href={att.url} target="_blank" rel="noreferrer"
                              style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#94a3b8", display: "flex" }}
                              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#6366f1"}
                              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"}
                            ><ExternalLink size={13} /></a>
                          )}
                          <button onClick={() => deleteSavedAttachment(att.id)} disabled={deletingAtt === att.id}
                            style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#cbd5e1", transition: "all 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                          >
                            {deletingAtt === att.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <X size={14} />}
                          </button>
                        </div>
                      )
                    })}
                    {pendingFiles.map(pf => {
                      const meta = getFileMeta(pf.name)
                      const Icon = meta.icon
                      return (
                        <div key={pf.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px dashed color-mix(in oklch, var(--accent) 28%, #e2e8f0)", background: "color-mix(in oklch, var(--accent) 6%, transparent)" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={16} color={meta.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pf.name}</div>
                            <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, fontWeight: 600 }}>{formatBytes(pf.file.size)} · En attente</div>
                          </div>
                          <button onClick={() => setPendingFiles(p => p.filter(f => f.id !== pf.id))}
                            style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#cbd5e1" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                          ><X size={14} /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
      </div>

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
