"use client"

import { useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Check, Loader2, AlertCircle, Upload, X,
  FileText, FileSpreadsheet, Archive, Film, ImageIcon,
  Paperclip, Dumbbell,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type PendingFile = {
  id: string
  file: File
  name: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

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

// ── Toast ─────────────────────────────────────────────────────────────────────

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

export default function NewExercicePage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const moduleId = searchParams.get("moduleId") || ""
  const router = useRouter()
  const { toasts, push } = useToast()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [files, setFiles] = useState<PendingFile[]>([])
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const added: PendingFile[] = Array.from(incoming).map(f => ({ id: uid(), file: f, name: f.name }))
    setFiles(p => [...p, ...added])
  }

  function removeFile(id: string) {
    setFiles(p => p.filter(f => f.id !== id))
  }

  async function handleSave() {
    if (!title.trim()) { push("err", "Titre requis"); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append("moduleId", moduleId)
      fd.append("title", title.trim())
      fd.append("description", description.trim())
      if (deadline) fd.append("deadline", new Date(deadline).toISOString())
      files.forEach(f => fd.append("files", f.file, f.name))
      const res = await fetch(`/api/instructor/groups/${slug}/exercice`, { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur serveur")
      push("ok", "Exercice créé !")
      setTimeout(() => router.push(`/instructor-dashboard/groups/${slug}?view=overview`), 800)
    } catch (e: any) {
      push("err", e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc", fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{
            padding: "0 28px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e8ecf3",
            background: "#fff",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => router.back()}
                style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
              >
                <ArrowLeft size={16} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Dumbbell size={16} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Créer un exercice</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{files.length} fichier{files.length !== 1 ? "s" : ""} joint{files.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => router.back()}
                style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: saving ? "none" : "0 2px 8px color-mix(in oklch, var(--accent) 28%, transparent)" }}
              >
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Title */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                  Titre de l'exercice <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Implémentation d'un algorithme de tri…"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0f172a",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                />
              </div>

              {/* Description */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                  Description & consignes
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Décrivez l'exercice, les objectifs pédagogiques, les contraintes techniques, les critères d'évaluation…"
                  rows={7}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    fontSize: 14,
                    color: "#0f172a",
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.7,
                    boxSizing: "border-box",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                />
                <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
                  {description.length} caractères
                </div>
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
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in oklch, var(--accent) 14%, transparent)" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                />
              </div>

              {/* Attachments */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Pièces jointes
                  </label>
                  {files.length > 0 && (
                    <span style={{ fontSize: 11, color: "color-mix(in oklch, var(--accent) 85%, black)", fontWeight: 700, background: "color-mix(in oklch, var(--accent) 8%, transparent)", padding: "3px 10px", borderRadius: 99, border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)" }}>
                      {files.length} fichier{files.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: dragging ? "2px dashed var(--accent)" : "2px dashed color-mix(in oklch, var(--accent) 28%, #e2e8f0)",
                    borderRadius: 14,
                    padding: "32px 24px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragging ? "color-mix(in oklch, var(--accent) 4%, transparent)" : "#f8fafc",
                    transition: "all 0.2s",
                    marginBottom: files.length > 0 ? 16 : 0,
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}>
                    <Upload size={20} color="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                    Glissez des fichiers ici
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    ou <span style={{ color: "var(--accent)", fontWeight: 600 }}>cliquez pour parcourir</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8 }}>
                    PDF, Word, Excel, images, vidéos, archives…
                  </div>
                </div>

                <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />

                {/* File list */}
                {files.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {files.map(f => {
                      const meta = getFileMeta(f.name)
                      const Icon = meta.icon
                      return (
                        <div key={f.id} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid #e8ecf3",
                          background: "#f8fafc",
                        }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={16} color={meta.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {f.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                              {formatBytes(f.file.size)}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(f.id)}
                            style={{ padding: "4px 6px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#cbd5e1", transition: "all 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
      </div>

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: t.type === "ok" ? "#0f172a" : "#fef2f2",
            color: t.type === "ok" ? "#fff" : "#dc2626",
            border: t.type === "err" ? "1px solid #fecaca" : "none",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            {t.type === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
            {t.msg}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
