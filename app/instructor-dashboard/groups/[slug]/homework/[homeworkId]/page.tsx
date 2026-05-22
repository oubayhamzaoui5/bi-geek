"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronRight, ArrowLeft, Paperclip, Clock, Upload,
  FileText, FileSpreadsheet, Archive, Film, Image as ImageIcon,
  ExternalLink, Check, X, Loader2, AlertTriangle,
  ClipboardList, ClipboardCheck, Calendar, Users,
  Pencil, Trash2, Plus,
} from "lucide-react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import LoadingBI from "@/components/LoadingBI"

// ── Types ──────────────────────────────────────────────────────────────────────

type HwAttachment = { id: string; name: string; url: string | null }
type SubFile      = { id: string; name: string; url: string | null }
type Submission   = {
  id: string
  studentId: string
  submittedAt: string
  student: { id: string; name: string; surname: string; username: string; email: string } | null
  files: SubFile[]
}
type Homework = {
  id: string; moduleId: string; groupId: string
  title: string; text: string; deadline: string | null
  attachments: HwAttachment[]
}
type Group  = { id: string; title: string; instructor: { name: string; surname: string } | null }
type HwNav  = { id: string; moduleId: string; title: string; deadline: string | null }

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFileMeta(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["mp4","mov","avi","mkv"].includes(ext)) return { icon: <Film size={17} />,          color: "#7c3aed", bg: "#f5f3ff", label: ext.toUpperCase() }
  if (ext === "pdf")                            return { icon: <FileText size={17} />,       color: "#dc2626", bg: "#fef2f2", label: "PDF" }
  if (["doc","docx"].includes(ext))             return { icon: <FileText size={17} />,       color: "#2563eb", bg: "#eff6ff", label: ext.toUpperCase() }
  if (["xls","xlsx"].includes(ext))             return { icon: <FileSpreadsheet size={17} />,color: "#16a34a", bg: "#f0fdf4", label: ext.toUpperCase() }
  if (["zip","rar","7z"].includes(ext))         return { icon: <Archive size={17} />,        color: "#d97706", bg: "#fffbeb", label: ext.toUpperCase() }
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return { icon: <ImageIcon size={17} />, color: "#0891b2", bg: "#ecfeff", label: ext.toUpperCase() }
  return { icon: <Paperclip size={17} />, color: "#6b7280", bg: "#f4f6fb", label: ext.toUpperCase() || "FILE" }
}

function deadlineInfo(deadline: string | null) {
  if (!deadline) return null
  const d = new Date(deadline)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const passed = diff < 0
  const days  = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
  const hours = Math.floor((Math.abs(diff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins  = Math.floor((Math.abs(diff) % (1000 * 60 * 60)) / (1000 * 60))
  return { passed, days, hours, mins, date: d }
}

function fmtDateTime(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function initials(name: string, surname: string) {
  return ((name?.[0] || "") + (surname?.[0] || "")).toUpperCase() || "?"
}

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444"]
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

// ── Toast ──────────────────────────────────────────────────────────────────────

type Toast = { type: "ok"|"err"; msg: string }
function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const push = useCallback((type: "ok"|"err", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])
  return { toast, push }
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function InstructorHomeworkPage() {
  const { slug: groupId, homeworkId } = useParams<{ slug: string; homeworkId: string }>()
  const router = useRouter()
  const { toast, push } = useToast()

  const [hw,          setHw]          = useState<Homework | null>(null)
  const [group,       setGroup]       = useState<Group | null>(null)
  const [allHw,       setAllHw]       = useState<HwNav[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [studentIds,  setStudentIds]  = useState<string[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState(false)
  const [form,        setForm]        = useState({ title: "", text: "", deadline: "" })
  const [saving,      setSaving]      = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!groupId || !homeworkId) return
    setLoading(true)
    fetch(`/api/instructor/groups/${groupId}/homework/${homeworkId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        setHw(d.homework)
        setGroup(d.group)
        setAllHw(d.allHomework || [])
        setSubmissions(d.submissions || [])
        setStudentIds(d.studentIds || [])
        if (d.homework) setForm({ title: d.homework.title, text: d.homework.text, deadline: d.homework.deadline || "" })
      })
      .finally(() => setLoading(false))
  }, [groupId, homeworkId])

  async function saveEdit() {
    if (!hw) return
    setSaving(true)
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/homework`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: hw.id, title: form.title, text: form.text, deadline: form.deadline || null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setHw(p => p ? { ...p, ...d.homework } : p)
      setEditing(false)
      push("ok", "Devoir mis à jour")
    } catch (err: any) { push("err", err.message) }
    finally { setSaving(false) }
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!hw || !e.target.files?.length) return
    const file = e.target.files[0]
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("homeworkId", hw.id)
      fd.append("name", file.name)
      fd.append("file", file)
      const res = await fetch(`/api/instructor/groups/${groupId}/homework/attachments`, { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setHw(p => p ? { ...p, attachments: [...p.attachments, d.attachment] } : p)
      push("ok", "Fichier ajouté")
    } catch (err: any) { push("err", err.message) }
    finally { setUploading(false); e.target.value = "" }
  }

  async function deleteAttachment(attId: string) {
    try {
      const res = await fetch(`/api/instructor/groups/${groupId}/homework/attachments`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setHw(p => p ? { ...p, attachments: p.attachments.filter(a => a.id !== attId) } : p)
      push("ok", "Fichier supprimé")
    } catch (err: any) { push("err", err.message) }
  }

  const withSidebar = (content: React.ReactNode) => (
    <SidebarProvider>
      <div className="h-screen bg-[#fafafa]">
        <Sidebar compact />
        <main className="md:ml-[60px] h-screen overflow-auto">{content}</main>
      </div>
    </SidebarProvider>
  )

  if (loading) return <LoadingBI />

  if (!hw) return withSidebar(
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fafafa" }}>
      <div style={{ textAlign: "center" }}>
        <ClipboardList size={40} style={{ color: "#fde68a", margin: "0 auto 12px" }} />
        <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 600, margin: "0 0 8px", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>Devoir introuvable</p>
        <Link href={`/instructor-dashboard/groups/${groupId}`} style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>← Retour au groupe</Link>
      </div>
    </div>
  )

  const dl           = deadlineInfo(hw.deadline)
  const passed       = dl?.passed ?? false
  const notSubmitted = studentIds.filter(id => !submissions.some(s => s.studentId === id))

  return withSidebar(
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>

      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff", borderBottom: "1px solid #f1f5f9",
        padding: "14px 28px 0", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", color: "#4b5563", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9" }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff" }}
          ><ArrowLeft size={14} /></button>
          <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/instructor-dashboard/overview" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Accueil</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href="/instructor-dashboard/groups" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Formations</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href={`/instructor-dashboard/groups/${groupId}`} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {group?.title || groupId}
            </Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hw.title}</span>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 20, height: 3, borderRadius: 99, background: "#f59e0b" }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f59e0b" }}>Devoir</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>·</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                {submissions.length}/{studentIds.length} rendu{submissions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{hw.title}</h1>
          </div>
          <button onClick={() => { setEditing(e => !e); setForm({ title: hw.title, text: hw.text, deadline: hw.deadline || "" }) }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: editing ? "#f1f5f9" : "transparent", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = editing ? "#f1f5f9" : "transparent" }}
          >
            {editing ? <><X size={13} /> Annuler</> : <><Pencil size={13} /> Modifier</>}
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ padding: "24px 28px 80px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* ══ LEFT ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Details card */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fffbeb", border: "1.5px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardList size={18} color="#f59e0b" />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>Consignes</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Visibles par les étudiants</p>
                </div>
              </div>
            </div>

            <div style={{ padding: "0 24px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              {editing ? (
                <>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Titre du devoir…"
                    style={{ padding: "9px 14px", border: "1.5px solid #fbbf24", borderRadius: 10, fontSize: 15, fontWeight: 700, color: "#111827", outline: "none", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}
                  />
                  <textarea value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                    placeholder="Consignes du devoir…" rows={5}
                    style={{ padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#374151", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.7 }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#fbbf24")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", flexShrink: 0 }}>Deadline :</label>
                    <input type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                      style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit", flex: 1 }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#fbbf24")}
                      onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveEdit} disabled={saving}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}
                    >{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Enregistrer</button>
                    <button onClick={() => setEditing(false)}
                      style={{ padding: "9px 14px", background: "#f4f6fb", border: "1px solid #e8ecf3", borderRadius: 10, fontSize: 13, color: "#6b7280", cursor: "pointer" }}
                    ><X size={13} /></button>
                  </div>
                </>
              ) : (
                <>
                  {hw.text ? (
                    <p style={{ fontSize: 15, color: "#374151", margin: 0, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{hw.text}</p>
                  ) : (
                    <p style={{ fontSize: 14, color: "#9ca3af", margin: 0, fontStyle: "italic" }}>Aucune consigne. Cliquez sur "Modifier" pour en ajouter.</p>
                  )}
                  {hw.deadline && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: passed ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.1)", border: `1px solid ${passed ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.25)"}`, width: "fit-content" }}>
                      <Clock size={12} color={passed ? "#ef4444" : "#f59e0b"} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: passed ? "#ef4444" : "#92400e" }}>
                        Deadline : {fmtDateTime(new Date(hw.deadline))}{passed ? " (expirée)" : ""}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ height: 3, background: "linear-gradient(90deg, #f59e0b, #fbbf24, transparent)" }} />
          </div>

          {/* Attachments */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
              <Paperclip size={14} color="#6b7280" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Fichiers joints</span>
              {hw.attachments.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f1f5f9", borderRadius: 99, padding: "2px 8px" }}>{hw.attachments.length}</span>
              )}
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#92400e", cursor: uploading ? "not-allowed" : "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef3c7" }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fffbeb" }}
              >
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Ajouter
              </button>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {hw.attachments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <Paperclip size={24} color="#e2e8f0" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Aucun fichier joint</p>
                </div>
              ) : hw.attachments.map(att => {
                const meta = getFileMeta(att.name)
                return (
                  <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#fafafa", transition: "all 0.12s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f4f6fb"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "#fafafa"}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0", fontWeight: 600, letterSpacing: "0.04em" }}>{meta.label}</p>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {att.url && (
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          style={{ padding: "5px 6px", borderRadius: 7, color: "#9ca3af", textDecoration: "none", transition: "all 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#374151"; (e.currentTarget as HTMLAnchorElement).style.background = "#e8ecf3" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent" }}
                        ><ExternalLink size={13} /></a>
                      )}
                      <button onClick={() => deleteAttachment(att.id)}
                        style={{ padding: "5px 6px", background: "transparent", border: "none", borderRadius: 7, cursor: "pointer", color: "#e5e7eb", transition: "all 0.12s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                      ><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submissions */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
              <ClipboardCheck size={14} color="#10b981" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Rendus des étudiants</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "#dcfce7", borderRadius: 99, padding: "2px 8px" }}>
                {submissions.length}/{studentIds.length}
              </span>
            </div>

            {submissions.length === 0 && notSubmitted.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <Users size={28} color="#e2e8f0" style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Aucun étudiant dans ce groupe</p>
              </div>
            ) : (
              <div style={{ padding: "12px 0" }}>
                {/* Submitted */}
                {submissions.map(sub => (
                  <div key={sub.id} style={{ padding: "12px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: sub.student ? avatarColor(sub.studentId) : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#fff" }}>
                      {sub.student ? initials(sub.student.name, sub.student.surname) : "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>
                          {sub.student ? [sub.student.name, sub.student.surname].filter(Boolean).join(" ") || sub.student.username : sub.studentId.slice(0, 8) + "…"}
                        </p>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 99, background: "#dcfce7", color: "#15803d", fontSize: 10, fontWeight: 700 }}>
                          <Check size={8} strokeWidth={3} /> Rendu
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 6px" }}>
                        {new Date(sub.submittedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {sub.files.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {sub.files.map(f => {
                            const meta = getFileMeta(f.name)
                            return (
                              <a key={f.id} href={f.url || "#"} target="_blank" rel="noopener noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, background: "#f8fafc", border: "1px solid #f3f4f6", textDecoration: "none", transition: "background 0.12s", width: "fit-content" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={e => (e.currentTarget.style.background = "#f8fafc")}
                              >
                                <span style={{ color: meta.color }}>{meta.icon}</span>
                                <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{f.name}</span>
                                <ExternalLink size={10} color="#9ca3af" />
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Not submitted */}
                {notSubmitted.length > 0 && (
                  <div style={{ padding: "10px 20px 4px", borderTop: submissions.length > 0 ? "1px solid #f0f1f5" : "none" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      N'ont pas encore rendu ({notSubmitted.length})
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {notSubmitted.map(id => (
                        <div key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: "#fef9ee", border: "1px solid #fde68a" }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: avatarColor(id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>?</div>
                          <span style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>{id.slice(0, 6)}…</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>{/* end left */}

        {/* ══ RIGHT SIDEBAR ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 104, alignSelf: "start" }}>

          {/* Deadline */}
          {dl && (
            <div style={{ background: dl.passed ? "#fef2f2" : "#fffbeb", borderRadius: 16, border: `1.5px solid ${dl.passed ? "#fecaca" : "#fde68a"}`, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: dl.passed ? "#fee2e2" : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {dl.passed ? <AlertTriangle size={16} color="#ef4444" /> : <Clock size={16} color="#f59e0b" />}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: dl.passed ? "#ef4444" : "#f59e0b", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {dl.passed ? "Expirée" : "Deadline"}
                  </p>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                    {dl.passed ? "Date limite dépassée" : "Temps restant aux étudiants"}
                  </p>
                </div>
              </div>
              {!dl.passed && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {dl.days > 0 && (
                    <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #fde68a", padding: "8px 4px", textAlign: "center" }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#92400e", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{dl.days}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#b45309", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>jours</p>
                    </div>
                  )}
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #fde68a", padding: "8px 4px", textAlign: "center" }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: "#92400e", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{dl.hours}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#b45309", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>heures</p>
                  </div>
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #fde68a", padding: "8px 4px", textAlign: "center" }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: "#92400e", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{dl.mins}</p>
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

          {/* Progress */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Progression</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${studentIds.length > 0 ? (submissions.length / studentIds.length) * 100 : 0}%`, background: "linear-gradient(90deg, #10b981, #34d399)", borderRadius: 99, transition: "width 0.5s ease" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#111827", minWidth: 32, textAlign: "right" }}>
                {studentIds.length > 0 ? Math.round((submissions.length / studentIds.length) * 100) : 0}%
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              <span style={{ fontWeight: 700, color: "#10b981" }}>{submissions.length}</span> sur{" "}
              <span style={{ fontWeight: 700, color: "#111827" }}>{studentIds.length}</span> étudiants ont rendu
            </p>
          </div>

          {/* Other homework */}
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
                      onClick={() => router.push(`/instructor-dashboard/groups/${groupId}/homework/${h.id}`)}
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
      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleAttachmentUpload} />

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
