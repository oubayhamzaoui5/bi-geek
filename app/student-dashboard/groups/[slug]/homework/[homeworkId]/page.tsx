"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronRight, ArrowLeft, Paperclip, Clock, Upload,
  FileText, FileSpreadsheet, Archive, Film, Image,
  ExternalLink, Check, X, Loader2, AlertTriangle,
  ClipboardList, ClipboardCheck, Calendar, Send,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ──────────────────────────────────────────────────────────────────────

type HwAttachment  = { id: string; name: string; url: string | null }
type SubFile       = { id: string; name: string; url: string | null }
type Submission    = { id: string; submittedAt: string; files: SubFile[] }
type Homework = {
  id: string
  moduleId: string
  groupId: string
  title: string
  text: string
  deadline: string | null
  attachments: HwAttachment[]
  submission: Submission | null
}
type Group = { id: string; title: string; instructor: { name: string; surname: string } | null }
type HwNav = { id: string; moduleId: string; title: string; deadline: string | null }

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStudentId() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null
    const u = raw ? JSON.parse(raw) : null
    const id = u?.id ?? u?.record?.id ?? u?.user?.id ?? ""
    return typeof id === "string" ? id.trim() : ""
  } catch { return "" }
}

function getFileMeta(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["mp4","mov","avi","mkv"].includes(ext)) return { icon: <Film   size={18} />, color: "#7c3aed", bg: "#f5f3ff", label: ext.toUpperCase() }
  if (ext === "pdf")                            return { icon: <FileText size={18} />, color: "#dc2626", bg: "#fef2f2", label: "PDF" }
  if (["doc","docx"].includes(ext))             return { icon: <FileText size={18} />, color: "#2563eb", bg: "#eff6ff", label: ext.toUpperCase() }
  if (["xls","xlsx"].includes(ext))             return { icon: <FileSpreadsheet size={18} />, color: "#16a34a", bg: "#f0fdf4", label: ext.toUpperCase() }
  if (["zip","rar","7z"].includes(ext))         return { icon: <Archive size={18} />, color: "#d97706", bg: "#fffbeb", label: ext.toUpperCase() }
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return { icon: <Image size={18} />, color: "#0891b2", bg: "#ecfeff", label: ext.toUpperCase() }
  return { icon: <Paperclip size={18} />, color: "#6b7280", bg: "#f4f6fb", label: ext.toUpperCase() || "FILE" }
}

function deadlineInfo(deadline: string | null) {
  if (!deadline) return null
  const d = new Date(deadline)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const passed = diff < 0
  const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
  const hours = Math.floor((Math.abs(diff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((Math.abs(diff) % (1000 * 60 * 60)) / (1000 * 60))
  return { passed, days, hours, mins, date: d }
}

function fmtDateTime(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function StudentHomeworkPage() {
  const { slug: groupId, homeworkId } = useParams<{ slug: string; homeworkId: string }>()
  const router = useRouter()

  const [hw,        setHw]        = useState<Homework | null>(null)
  const [group,     setGroup]     = useState<Group | null>(null)
  const [allHw,     setAllHw]     = useState<HwNav[]>([])
  const [loading,   setLoading]   = useState(true)
  const [pending,   setPending]   = useState<File[]>([])
  const [removing,  setRemoving]  = useState<string[]>([])
  const [submitting,setSubmitting]= useState(false)
  const [isDragging,setIsDragging]= useState(false)
  const [toast,     setToast]     = useState<{ type: "ok"|"err"; msg: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((type: "ok"|"err", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    if (!groupId || !homeworkId) return
    const studentId = getStudentId()
    const url = `/api/student/groups/${groupId}/homework/${homeworkId}${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`
    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        setHw(d.homework)
        setGroup(d.group)
        setAllHw(d.allHomework || [])
      })
      .finally(() => setLoading(false))
  }, [groupId, homeworkId])

  async function handleSubmit() {
    if (!hw) return
    const studentId = getStudentId()
    if (!studentId) { showToast("err", "Vous devez être connecté"); return }
    if (pending.length === 0 && removing.length === 0) return

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("studentId", studentId)
      for (const f of pending) fd.append("files", f)
      if (hw.submission && removing.length > 0) fd.append("deleteFileIds", JSON.stringify(removing))

      const method = hw.submission ? "PATCH" : "POST"
      const res = await fetch(`/api/student/groups/${groupId}/homework/${homeworkId}/submit`, { method, body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      setHw(p => p ? { ...p, submission: d.submission } : p)
      setPending([])
      setRemoving([])
      showToast("ok", hw.submission ? "Rendu mis à jour !" : "Devoir soumis !")
    } catch (err: any) {
      showToast("err", err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) setPending(p => [...p, ...files])
  }

  if (loading) return <LoadingBI />

  if (!hw) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fafafa" }}>
      <div style={{ textAlign: "center" }}>
        <ClipboardList size={40} style={{ color: "#fde68a", margin: "0 auto 12px" }} />
        <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 600, margin: "0 0 8px", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>Devoir introuvable</p>
        <Link href={`/student-dashboard/groups/${groupId}`} style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>← Retour au groupe</Link>
      </div>
    </div>
  )

  const dl       = deadlineInfo(hw.deadline)
  const passed   = dl?.passed ?? false
  const canEdit  = !passed
  const hasSub   = !!hw.submission
  const hasChange= pending.length > 0 || removing.length > 0

  // visible submitted files (excluding ones marked for removal)
  const visibleSubFiles = hw.submission?.files.filter(f => !removing.includes(f.id)) ?? []

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>

      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff",
        borderBottom: "1px solid #f1f5f9",
        padding: "14px 28px 0",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", color: "#4b5563", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9" }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff" }}
          ><ArrowLeft size={14} /></button>
          <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/student-dashboard" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Accueil</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href="/student-dashboard/groups" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Formations</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href={`/student-dashboard/groups/${groupId}`} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {group?.title || groupId}
            </Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hw.title}</span>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingBottom: 14, display: "flex", alignItems: "flex-end", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 20, height: 3, borderRadius: 99, background: "#f59e0b" }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f59e0b" }}>Devoir</span>
              {hasSub && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700 }}>
                  <Check size={9} strokeWidth={3} /> Rendu
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{hw.title}</h1>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ padding: "24px 28px 80px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* ══ LEFT ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Description card */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fffbeb", border: "1.5px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardList size={18} color="#f59e0b" />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>Consignes</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Lisez attentivement avant de rendre</p>
                </div>
              </div>
            </div>
            <div style={{ padding: "0 24px 22px" }}>
              {hw.text ? (
                <p style={{ fontSize: 15, color: "#374151", margin: 0, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{hw.text}</p>
              ) : (
                <p style={{ fontSize: 14, color: "#9ca3af", margin: 0, fontStyle: "italic" }}>Aucune consigne fournie.</p>
              )}
            </div>
            {/* Amber bottom border accent */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #f59e0b, #fbbf24, transparent)" }} />
          </div>

          {/* Instructor attachments */}
          {hw.attachments.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                <Paperclip size={14} color="#6b7280" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Ressources du formateur</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f1f5f9", borderRadius: 99, padding: "2px 8px" }}>{hw.attachments.length}</span>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                {hw.attachments.map(att => {
                  const meta = getFileMeta(att.name)
                  return (
                    <a key={att.id} href={att.url || "#"} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#fafafa", textDecoration: "none", transition: "all 0.12s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#e2e8f0" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderColor = "#f3f4f6" }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", fontWeight: 600, letterSpacing: "0.04em" }}>{meta.label}</p>
                      </div>
                      <ExternalLink size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submission area */}
          <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${hasSub ? "#bbf7d0" : "#fde68a"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${hasSub ? "#dcfce7" : "#fef3c7"}`, background: hasSub ? "#f0fdf4" : "#fffbeb", display: "flex", alignItems: "center", gap: 8 }}>
              {hasSub
                ? <ClipboardCheck size={15} color="#10b981" />
                : <Send size={15} color="#f59e0b" />
              }
              <span style={{ fontSize: 13, fontWeight: 700, color: hasSub ? "#065f46" : "#92400e" }}>
                {hasSub ? "Votre rendu" : "Rendre le devoir"}
              </span>
              {hasSub && hw.submission?.submittedAt && (
                <span style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>
                  Soumis le {new Date(hw.submission.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Submitted files */}
              {visibleSubFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {visibleSubFiles.map(f => {
                    const meta = getFileMeta(f.name)
                    return (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                          {meta.icon}
                        </div>
                        {f.url ? (
                          <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#065f46", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</a>
                        ) : (
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#065f46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                        )}
                        {canEdit && (
                          <button onClick={() => setRemoving(p => [...p, f.id])}
                            style={{ padding: "4px 5px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#86efac", transition: "color 0.12s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#86efac"}
                            title="Retirer ce fichier"
                          ><X size={13} /></button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pending new files */}
              {pending.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {pending.map((f, i) => {
                    const meta = getFileMeta(f.name)
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "#fffbeb", border: "1.5px dashed #fbbf24" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                          {meta.icon}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#92400e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                        <button onClick={() => setPending(p => p.filter((_, j) => j !== i))}
                          style={{ padding: "4px 5px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#fbbf24", transition: "color 0.12s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#fbbf24"}
                        ><X size={13} /></button>
                      </div>
                    )
                  })}
                </div>
              )}

              {canEdit ? (
                <>
                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? "#f59e0b" : "#fde68a"}`,
                      borderRadius: 12,
                      padding: "24px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: isDragging ? "#fffbeb" : "#fefce8",
                      transition: "all 0.15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#fffbeb"; (e.currentTarget as HTMLDivElement).style.borderColor = "#f59e0b" }}
                    onMouseLeave={e => { if (!isDragging) { (e.currentTarget as HTMLDivElement).style.background = "#fefce8"; (e.currentTarget as HTMLDivElement).style.borderColor = "#fde68a" } }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef3c7", border: "1.5px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Upload size={20} color="#f59e0b" />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#92400e", margin: "0 0 3px" }}>
                        {isDragging ? "Relâchez pour ajouter" : "Glissez vos fichiers ici"}
                      </p>
                      <p style={{ fontSize: 12, color: "#b45309", margin: 0 }}>ou cliquez pour parcourir</p>
                    </div>
                  </div>

                  {/* Submit button */}
                  {hasChange && (
                    <button onClick={handleSubmit} disabled={submitting}
                      style={{
                        width: "100%", padding: "12px 20px",
                        background: submitting ? "#fde68a" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        border: "none", borderRadius: 12,
                        fontSize: 14, fontWeight: 700, color: "#fff",
                        cursor: submitting ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        boxShadow: submitting ? "none" : "0 4px 14px rgba(245,158,11,0.35)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(245,158,11,0.45)" }}
                      onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(245,158,11,0.35)" }}
                    >
                      {submitting
                        ? <><Loader2 size={15} className="animate-spin" /> Envoi en cours…</>
                        : hasSub
                          ? <><ClipboardCheck size={15} /> Mettre à jour le rendu</>
                          : <><Send size={15} /> Soumettre le devoir</>
                      }
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", margin: "0 0 1px" }}>Délai écoulé</p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>La date limite est passée — les modifications ne sont plus possibles.</p>
                  </div>
                </div>
              )}

              {!hasSub && !canEdit && (
                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", margin: 0 }}>Vous n'avez pas rendu ce devoir.</p>
              )}
            </div>
          </div>

        </div>{/* end left */}

        {/* ══ RIGHT SIDEBAR ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 104, alignSelf: "start" }}>

          {/* Deadline card */}
          {dl && (
            <div style={{
              background: dl.passed ? "#fef2f2" : "#fffbeb",
              borderRadius: 16,
              border: `1.5px solid ${dl.passed ? "#fecaca" : "#fde68a"}`,
              padding: "18px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: dl.passed ? "#fee2e2" : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {dl.passed ? <AlertTriangle size={16} color="#ef4444" /> : <Clock size={16} color="#f59e0b" />}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: dl.passed ? "#ef4444" : "#f59e0b", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {dl.passed ? "Expiré" : "Deadline"}
                  </p>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                    {dl.passed ? "Le délai est passé" : "Temps restant"}
                  </p>
                </div>
              </div>

              {!dl.passed && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {dl.days > 0 && (
                    <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #fde68a", padding: "8px 4px", textAlign: "center" }}>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "#92400e", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{dl.days}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#b45309", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>jours</p>
                    </div>
                  )}
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #fde68a", padding: "8px 4px", textAlign: "center" }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#92400e", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{dl.hours}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#b45309", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>heures</p>
                  </div>
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #fde68a", padding: "8px 4px", textAlign: "center" }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#92400e", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{dl.mins}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#b45309", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>min</p>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, background: dl.passed ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.08)" }}>
                <Calendar size={11} color={dl.passed ? "#ef4444" : "#f59e0b"} />
                <span style={{ fontSize: 11, color: dl.passed ? "#ef4444" : "#b45309", fontWeight: 600 }}>
                  {fmtDateTime(dl.date)}
                </span>
              </div>
            </div>
          )}

          {/* Submission status */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Statut</p>
            {hasSub ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dcfce7", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={16} color="#16a34a" strokeWidth={2.5} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Rendu soumis</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0" }}>
                    {hw.submission!.files.length} fichier{hw.submission!.files.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: passed ? "#fee2e2" : "#fef3c7", border: `2px solid ${passed ? "#fca5a5" : "#fde68a"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {passed ? <AlertTriangle size={16} color="#ef4444" /> : <ClipboardList size={16} color="#f59e0b" />}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{passed ? "Non rendu" : "À faire"}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0" }}>
                    {passed ? "Délai dépassé" : "En attente de votre rendu"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Instructor card */}
          {group?.instructor && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Formateur</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "color-mix(in oklch, var(--accent) 10%, transparent)", border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)" }}>
                  {([group.instructor.name[0], group.instructor.surname[0]].filter(Boolean).join("").toUpperCase() || "?")}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>
                    {[group.instructor.name, group.instructor.surname].filter(Boolean).join(" ")}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0" }}>Formateur</p>
                </div>
              </div>
            </div>
          )}

          {/* Other homework in this group */}
          {allHw.length > 1 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Autres devoirs</span>
              </div>
              <div style={{ padding: "6px 0" }}>
                {allHw.filter(h => h.id !== hw.id).map(h => {
                  const hDl = deadlineInfo(h.deadline)
                  return (
                    <div key={h.id}
                      onClick={() => router.push(`/student-dashboard/groups/${groupId}/homework/${h.id}`)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fffbeb"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                    >
                      <ClipboardList size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</span>
                      {hDl && (
                        <span style={{ fontSize: 10, color: hDl.passed ? "#ef4444" : "#f59e0b", fontWeight: 600, flexShrink: 0 }}>
                          {hDl.passed ? "Expiré" : `${hDl.days}j`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>{/* end right */}

      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" multiple style={{ display: "none" }}
        onChange={e => {
          const files = Array.from(e.target.files || [])
          if (files.length) setPending(p => [...p, ...files])
          e.target.value = ""
        }}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 100,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600,
          background: "#fff",
          color: toast.type === "ok" ? "#15803d" : "#dc2626",
          border: toast.type === "ok" ? "1.5px solid #86efac" : "1.5px solid #fca5a5",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          animation: "slideUp 0.25s ease-out",
        }}>
          {toast.type === "ok" ? <Check size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
