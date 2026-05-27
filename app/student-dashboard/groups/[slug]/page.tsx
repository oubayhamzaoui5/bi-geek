"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronRight, BookOpen, Layers, Users, GraduationCap, Video,
  FileText, AlertCircle, LayoutList,
  ExternalLink,
  ChevronDown, Paperclip, BrainCircuit, ClipboardCheck,
  Calendar, Clock,
} from "lucide-react"
import GroupKpiCard from "@/components/groups/GroupKpiCard"
import LoadingBI from "@/components/LoadingBI"
import { STATUS_META, initials, avatarColor, type GroupStatus } from "@/components/groups/groupUtils"

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = "overview"
const TAB_ORDER: Tab[] = ["overview"]

function parseTab(value: string | null): Tab | null {
  if (!value) return null
  return TAB_ORDER.includes(value as Tab) ? (value as Tab) : null
}

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
  instructor: { id: string; name: string; surname: string; avatar?: string | null } | null
  instructors?: { id: string; name: string; surname: string; avatar?: string | null }[]
  program: Program | null
}

type Module      = { id: string; title: string; order: number; description: string }
type ModuleVideo = { id: string; moduleId: string; title: string; driveUrl: string; description: string; order: number }
type ModuleAttachment = { id: string; moduleId: string; name: string; url: string | null; order?: number }

type QuizItem     = { id: string; moduleId: string; title: string; deadline: string | null; questionsCount: number }
type ExerciseItem = { id: string; moduleId: string; title: string; description: string; deadline: string | null; attachmentsCount: number }
type SessionInfo  = { id: string; date: string; start_time: string; duration: number; title: string | null; joinUrl: string | null }

// ── Main Page ──────────────────────────────────────────────────────────────────

function isPdf(name: string) { return name.split(".").pop()?.toLowerCase() === "pdf" }

function fmtDeadline(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function fmtSessionDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

function sessionDiffMins(date: string, time: string): number {
  return (new Date(`${date}T${time || "00:00"}:00`).getTime() - Date.now()) / 60000
}

const moduleExpandVariants = {
  open: {
    height: "auto",
    opacity: 1,
    y: 0,
    borderTopColor: "#f0f1f5",
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  collapsed: {
    height: 0,
    opacity: 0,
    y: -8,
    borderTopColor: "transparent",
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  },
}

export default function StudentGroupDetailPage() {
  const { slug: groupId } = useParams<{ slug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [group,              setGroup]              = useState<Group | null>(null)
  const [modules,            setModules]            = useState<Module[]>([])
  const [moduleVideos,       setModuleVideos]       = useState<ModuleVideo[]>([])
  const [moduleAttachments,  setModuleAttachments]  = useState<ModuleAttachment[]>([])
  const [quizzes,   setQuizzes]   = useState<QuizItem[]>([])
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [completedQuizIds, setCompletedQuizIds] = useState<Set<string>>(new Set())
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [formateurIndex, setFormateurIndex] = useState(0)
  const [loadError, setLoadError] = useState("")
  const [nextSession, setNextSession] = useState<SessionInfo | null>(null)

  useEffect(() => {
    const tabFromQuery = parseTab(searchParams.get("view")) ?? "overview"
    setActiveTab(prev => (prev === tabFromQuery ? prev : tabFromQuery))
  }, [searchParams])

  function getStudentId() {
    try {
      const userString = typeof window !== "undefined" ? localStorage.getItem("user") : null
      const user = userString ? JSON.parse(userString) : null
      const id = user?.id ?? user?.record?.id ?? user?.user?.id ?? ""
      return typeof id === "string" ? id.trim() : ""
    } catch { return "" }
  }

  useEffect(() => {
    if (!groupId) return
    const load = async () => {
      setLoading(true)
      setLoadError("")
      try {
        const [gRes, cRes, qRes, exRes, nsRes] = await Promise.all([
          fetch(`/api/student/groups/${groupId}`),
          fetch(`/api/student/groups/${groupId}/curriculum`),
          fetch(`/api/student/groups/${groupId}/quiz`),
          fetch(`/api/student/groups/${groupId}/exercice`),
          fetch(`/api/student/groups/${groupId}/next-session`),
        ])
        if (gRes.status === 401 || cRes.status === 401) {
          localStorage.removeItem("user")
          router.replace(`/login?next=/student-dashboard/groups/${groupId}`)
          return
        }
        if (gRes.status === 403 || cRes.status === 403) {
          setLoadError("Acces refuse. Reconnectez-vous puis reessayez.")
          return
        }
        if (gRes.ok) {
          const d = await gRes.json()
          if (d.ok) {
            setGroup(d.group)
          }
        } else {
          const d = await gRes.json().catch(() => ({}))
          setLoadError(d?.error || "Groupe introuvable")
        }
        if (cRes.ok) {
          const d = await cRes.json()
          if (d.ok) {
            setModules(d.modules || [])
            setModuleVideos(d.moduleVideos || [])
            setModuleAttachments(d.moduleAttachments || [])
            if ((d.modules || []).length > 0) setExpandedModules(new Set([(d.modules[0] as Module).id]))
          }
        }
        if (qRes.ok) {
          const d = await qRes.json()
          if (d.ok) {
            const quizList: QuizItem[] = d.quizzes || []
            setQuizzes(quizList)
            // Check which quizzes the student already completed
            const sid = getStudentId()
            if (sid && quizList.length > 0) {
              const results = await Promise.all(
                quizList.map(q =>
                  fetch(`/api/student/groups/${groupId}/quiz/${q.id}/submit?studentId=${sid}`)
                    .then(r => r.json()).catch(() => ({ ok: false }))
                )
              )
              const done = new Set<string>()
              quizList.forEach((q, i) => { if (results[i]?.ok && results[i]?.submission) done.add(q.id) })
              setCompletedQuizIds(done)
            }
          }
        }
        if (exRes.ok) {
          const d = await exRes.json()
          if (d.ok) setExercises(d.exercises || [])
        }
        if (nsRes.ok) {
          const d = await nsRes.json()
          if (d.ok) setNextSession(d.session || null)
        }
      } catch {
        setLoadError("Erreur lors du chargement du groupe.")
      }
      finally { setLoading(false) }
    }
    load()
  }, [groupId])


  if (loading) return <LoadingBI />

  if (!group) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fafafa" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 8px" }}>{loadError || "Groupe introuvable"}</p>
          <Link href="/student-dashboard/groups" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>← Retour aux formations</Link>
        </div>
      </div>
    )
  }

  const sm = STATUS_META[group.status]
  const isBootcamp = group.programType === "bootcamp"
  const formateurs = (group.instructors && group.instructors.length > 0) ? group.instructors : (group.instructor ? [group.instructor] : [])
  const currentFormateur = formateurs[formateurIndex % Math.max(formateurs.length, 1)]
  const sortedModules = [...modules].sort((a, b) => a.order - b.order)

  // Build the unified item list per module
  function buildModuleItems(moduleId: string) {
    const mVideos = moduleVideos.filter(v => v.moduleId === moduleId).sort((a, b) => a.order - b.order)
    const mAtts = moduleAttachments.filter(a => a.moduleId === moduleId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    type Item =
      | { itype: "module_video"; id: string; order: number; key: string }
      | { itype: "module_attachment"; id: string; order: number; key: string }
    const items: Item[] = [
      ...mVideos.map(v => ({ itype: "module_video" as const, id: v.id, order: v.order, key: `mvideo:${v.id}` })),
      ...mAtts.map(a => ({ itype: "module_attachment" as const, id: a.id, order: a.order ?? 0, key: `matt:${a.id}` })),
    ]
    items.sort((a, b) => a.order - b.order)
    return items
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff",
        borderBottom: "1px solid #f1f5f9",
        padding: "14px 28px 0",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/student-dashboard" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Accueil</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <Link href="/student-dashboard/groups" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>Formations</Link>
            <ChevronRight size={11} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {group.title}
            </span>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: sm.bg, color: sm.text, border: `1.5px solid ${sm.border}` }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot }} />
            {sm.label}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
          <div style={{ marginTop: -5 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{group.title}</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "1px 0 0" }}>{group.program?.title || (isBootcamp ? "Bootcamp" : "Formation")}</p>
          </div>
        </div>
      </header>

      {/* ─── VUE D'ENSEMBLE ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
      {activeTab === "overview" && (
        <div style={{ padding: "24px 28px 64px", display: "grid", gap: 20, alignContent: "start" }}>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { icon: Users,      value: group.students.length,       label: "Apprenants", iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: LayoutList, value: modules.length,              label: "Modules",   iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: Video,      value: moduleVideos.length,          label: "Vidéos",   iconColor: "#f59e0b", iconBg: "rgba(245,158,11,0.08)" },
              { icon: FileText,   value: moduleAttachments.length,     label: "Fichiers", iconColor: "#10b981", iconBg: "rgba(16,185,129,0.08)" },
            ].map(card => <GroupKpiCard key={card.label} {...card} />)}
          </div>

          {/* 2-col: program info + sidebar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

            {/* Program description */}
            {group.program && (group.program.longDescription || group.program.shortDescription) ? (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {group.program.coverImage && (
                  <div style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden", position: "relative" }}>
                    <img src={group.program.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
                    <span style={{ position: "absolute", bottom: 12, left: 16, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.35)", padding: "3px 10px", borderRadius: 6, backdropFilter: "blur(4px)" }}>
                      {isBootcamp ? "Bootcamp" : "Formation"}
                    </span>
                  </div>
                )}
                <div style={{ padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 10px", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{group.program.title}</h3>
                  <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.75 }}>{group.program.longDescription || group.program.shortDescription}</p>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0", padding: "40px 24px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div>
                  {isBootcamp ? <Layers size={32} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} /> : <BookOpen size={32} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} />}
                  <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Aucune description de programme</p>
                </div>
              </div>
            )}

            {/* Right: instructor sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 104, alignSelf: "start" }}>
              {currentFormateur && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Formateur</p>
                    {formateurs.length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button type="button" aria-label="Formateur précédent" onClick={() => setFormateurIndex(i => (i - 1 + formateurs.length) % formateurs.length)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid color-mix(in oklch, var(--accent) 20%, #e2e8f0)", background: "color-mix(in oklch, var(--accent) 5%, white)", color: "color-mix(in oklch, var(--accent) 82%, black)", cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff" }} onMouseLeave={e => { e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 5%, white)"; e.currentTarget.style.color = "color-mix(in oklch, var(--accent) 82%, black)" }}>‹</button>
                        <button type="button" aria-label="Formateur suivant" onClick={() => setFormateurIndex(i => (i + 1) % formateurs.length)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid color-mix(in oklch, var(--accent) 20%, #e2e8f0)", background: "color-mix(in oklch, var(--accent) 5%, white)", color: "color-mix(in oklch, var(--accent) 82%, black)", cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff" }} onMouseLeave={e => { e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 5%, white)"; e.currentTarget.style.color = "color-mix(in oklch, var(--accent) 82%, black)" }}>›</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    {currentFormateur.avatar ? (
                      <img
                        src={currentFormateur.avatar}
                        alt=""
                        style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0, border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)" }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", background: "color-mix(in oklch, var(--accent) 10%, transparent)", border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)" }}>
                        {initials(currentFormateur.name, currentFormateur.surname)}
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{[currentFormateur.name, currentFormateur.surname].filter(Boolean).join(" ")}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <GraduationCap size={11} /> Formateur
                      </p>
                    </div>
                  </div>
                  {formateurs.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, margin: "-2px 0 12px" }}>
                      {formateurs.map((f, idx) => (
                        <button key={f.id} type="button" aria-label={`Formateur ${idx + 1}`} onClick={() => setFormateurIndex(idx)} style={{ width: idx === formateurIndex % formateurs.length ? 18 : 6, height: 6, borderRadius: 99, border: "none", background: idx === formateurIndex % formateurs.length ? "var(--accent)" : "#cbd5e1", cursor: "pointer", padding: 0, transition: "all 0.15s" }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Next Session card ── */}
              {nextSession && (() => {
                const diffMins = sessionDiffMins(nextSession.date, nextSession.start_time)
                const sessionEnd = new Date(new Date(`${nextSession.date}T${nextSession.start_time || "00:00"}:00`).getTime() + nextSession.duration * 60000)
                const isEnded = Date.now() > sessionEnd.getTime()
                if (isEnded) return null
                const canJoin = diffMins <= 10 && !!nextSession.joinUrl
                const timeLabel = diffMins > 1440
                  ? `Dans ${Math.round(diffMins / 1440)} j`
                  : diffMins > 60
                  ? `Dans ${Math.round(diffMins / 60)} h`
                  : diffMins > 0
                  ? `Dans ${Math.round(diffMins)} min`
                  : "En cours"
                return (
                  <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prochaine Séance</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: diffMins <= 10 ? "#16a34a" : diffMins <= 60 ? "#d97706" : "#6b7280", background: diffMins <= 10 ? "#f0fdf4" : diffMins <= 60 ? "#fffbeb" : "#f8fafc", padding: "2px 8px", borderRadius: 6 }}>{timeLabel}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <Calendar size={13} style={{ color: "#6b7280", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", textTransform: "capitalize" }}>{fmtSessionDate(nextSession.date)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <Clock size={13} style={{ color: "#6b7280", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {nextSession.start_time || "–"}
                        {nextSession.duration ? ` · ${nextSession.duration} min` : ""}
                      </span>
                    </div>
                    {nextSession.title && (
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", margin: "0 0 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextSession.title}</p>
                    )}
                    {nextSession.joinUrl ? (
                      <button
                        disabled={!canJoin}
                        onClick={() => window.open(nextSession.joinUrl!, "_blank")}
                        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", background: canJoin ? "#16a34a" : "#e5e7eb", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, color: canJoin ? "#fff" : "#9ca3af", cursor: canJoin ? "pointer" : "not-allowed", transition: "all 0.15s", boxShadow: canJoin ? "0 2px 8px rgba(22,163,74,0.3)" : "none" }}
                      >
                        <Video size={13} /> Rejoindre la séance
                      </button>
                    ) : (
                      <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 9, textAlign: "center" }}>
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>En attente du lien par le formateur</p>
                      </div>
                    )}
                    {nextSession.joinUrl && !canJoin && (
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0", textAlign: "center" }}>Rejoindre disponible 10 min avant</p>
                    )}
                  </div>
                )
              })()}


            </div>

          {/* ── Programme — same card design as instructor, read-only ── */}
          <div style={{ position: "relative", paddingLeft: 16 }}>
            <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: "linear-gradient(to bottom, var(--accent), color-mix(in oklch, var(--accent) 60%, white))", borderRadius: 99 }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Programme</span>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
              <span style={{ color: "#d1d5db", fontSize: 13 }}>·</span>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{moduleVideos.length + moduleAttachments.length} ressource{moduleVideos.length + moduleAttachments.length !== 1 ? "s" : ""}</span>
            </div>

            {modules.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0" }}>
                <BookOpen size={28} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Aucun module pour ce groupe</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sortedModules.map((mod, modIdx) => {
                  const isExpanded = expandedModules.has(mod.id)
                  const etapeNum = String(modIdx + 1).padStart(2, "0")
                  const allItems = buildModuleItems(mod.id)
                  const modResourcesCount = moduleVideos.filter(v => v.moduleId === mod.id).length + moduleAttachments.filter(a => a.moduleId === mod.id).length
                  return (
                    <div key={mod.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                      {/* Module header — same style as instructor */}
                      <div
                        style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 20px 18px", cursor: "pointer" }}
                        onClick={() => setExpandedModules(prev => { const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s })}
                      >
                        <div style={{ width: 54, height: 54, borderRadius: 13, border: "2px solid color-mix(in oklch, var(--accent) 100%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)", letterSpacing: "-0.03em" }}>
                          {etapeNum}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#b0b7c8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>ÉTAPE {etapeNum}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.25 }}>{mod.title}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <BookOpen size={12} color="#9ca3af" />
                            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{modResourcesCount} ressource{modResourcesCount !== 1 ? "s" : ""}</span>
                            {mod.description && (
                              <>
                                <span style={{ color: "#e2e8f0", fontSize: 12 }}>·</span>
                                <span style={{ fontSize: 12, color: "#b0b7c8" }}>{mod.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ padding: "5px 6px", color: "#9ca3af", cursor: "pointer" }}>
                          <ChevronDown size={17} style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />
                        </div>
                      </div>

                      {/* Expanded items — same row style, no editing controls */}
                      <motion.div
                        initial={false}
                        animate={isExpanded ? "open" : "collapsed"}
                        variants={moduleExpandVariants}
                        style={{ overflow: "hidden", borderTop: "1px solid #f0f1f5" }}
                        aria-hidden={!isExpanded}
                      >
                      {allItems.length > 0 && (
                        <div style={{ borderTop: "1px solid #f0f1f5" }}>
                          {allItems.map((item, itemIdx) => {
                            const baseRow: React.CSSProperties = {
                              display: "flex", alignItems: "center", gap: 14, padding: "11px 20px",
                              borderBottom: itemIdx < allItems.length - 1 ? "1px solid #f8f9fb" : "none",
                              transition: "background 0.12s",
                            }
                            if (item.itype === "module_video") {
                              const vid = moduleVideos.find(v => v.id === item.id)!
                              const vidViewerUrl = vid.driveUrl
                                ? `/student-dashboard/groups/${groupId}/video-viewer?url=${encodeURIComponent(vid.driveUrl)}&title=${encodeURIComponent(vid.title)}&groupTitle=${encodeURIComponent(group?.title || groupId)}`
                                : null;
                              return (
                                <div key={item.key} style={{ ...baseRow, cursor: vidViewerUrl ? "pointer" : "default" }}
                                  onClick={() => { if (vidViewerUrl) router.push(vidViewerUrl) }}
                                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(245,158,11,0.05)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                                >
                                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(245,158,11,0.35)" }}>
                                    <Video size={16} strokeWidth={2.5} color="#fff" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Vidéo</div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vid.title}</span>
                                  </div>
                                </div>
                              )
                            }
                            // module_attachment
                            const att    = moduleAttachments.find(a => a.id === item.id)!
                            const pdfUrl = att.url && isPdf(att.name)
                              ? `/student-dashboard/groups/${groupId}/pdf-viewer?url=${encodeURIComponent(att.url)}&name=${encodeURIComponent(att.name)}&groupTitle=${encodeURIComponent(group?.title || groupId)}`
                              : null
                            const isAttPdf = !!pdfUrl
                            return (
                              <div key={item.key}
                                onClick={() => { if (pdfUrl) { router.push(pdfUrl) } else if (att.url) { const a = document.createElement("a"); a.href = att.url; a.download = att.name; a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a) } }}
                                style={{ ...baseRow, cursor: att.url ? "pointer" : "default" }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isAttPdf ? "rgba(225,29,72,0.05)" : "rgba(20,184,166,0.05)"}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                              >
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: isAttPdf ? "#e11d48" : "#14b8a6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: isAttPdf ? "0 2px 8px rgba(225,29,72,0.35)" : "0 2px 8px rgba(20,184,166,0.35)" }}>
                                  {isAttPdf ? <FileText size={16} strokeWidth={2.5} color="#fff" /> : <Paperclip size={16} strokeWidth={2.5} color="#fff" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: isAttPdf ? "#e11d48" : "#0d9488", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>{isAttPdf ? "PDF" : "Fichier"}</div>
                                  <span style={{ fontSize: 14, fontWeight: 500, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {allItems.length === 0 && quizzes.filter(q => q.moduleId === mod.id).length === 0 && exercises.filter(ex => ex.moduleId === mod.id).length === 0 && (
                        <div style={{ padding: "20px 18px", textAlign: "center" }}>
                          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Aucun contenu pour ce module</p>
                        </div>
                      )}

                      {/* ── Quiz items ── */}
                      {quizzes.filter(q => q.moduleId === mod.id).map(quiz => (
                        <div key={quiz.id} style={{ borderTop: "1px solid #f0f1f5" }}>
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", cursor: "pointer", transition: "background 0.12s" }}
                            onClick={() => router.push(`/student-dashboard/groups/${groupId}/quiz/${quiz.id}`)}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f0f9ff"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                          >
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 28%, transparent)" }}>
                              <BrainCircuit size={16} strokeWidth={2.5} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Quiz</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{quiz.title}</span>
                                {quiz.deadline && (
                                  <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Deadline: {fmtDeadline(quiz.deadline)}</span>
                                )}
                              </div>
                            </div>
                            {completedQuizIds.has(quiz.id) ? (
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", background: "#f0fdf4", padding: "3px 10px", borderRadius: 99, border: "1px solid #86efac", flexShrink: 0, letterSpacing: "0.04em" }}>Complété</span>
                            ) : (
                              <ChevronRight size={14} style={{ color: "#d1d5db", flexShrink: 0 }} />
                            )}
                          </div>
                        </div>
                      ))}

                      {/* ── Exercise items ── */}
                      {exercises.filter(ex => ex.moduleId === mod.id).map(ex => {
                        const isOverdue = ex.deadline ? new Date(ex.deadline) < new Date() : false
                        return (
                          <div key={ex.id} style={{ borderTop: "1px solid #f0f1f5" }}>
                            <div
                              style={{ display: "flex", alignItems: "center", gap: 0, cursor: "pointer", transition: "background 0.15s", background: "transparent" }}
                              onClick={() => router.push(`/student-dashboard/groups/${groupId}/exercice/${ex.id}`)}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(6,182,212,0.04)"}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                            >
                              <div style={{ width: 4, minWidth: 4, alignSelf: "stretch", background: "linear-gradient(to bottom, #06b6d4, #0891b2)", borderRadius: "0 2px 2px 0" }} />
                              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px 13px 16px", flex: 1, minWidth: 0 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#0891b2,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 10px rgba(6,182,212,0.32)" }}>
                                  <ClipboardCheck size={17} strokeWidth={2.3} color="#fff" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "#0891b2", background: "rgba(6,182,212,0.1)", padding: "1px 7px", borderRadius: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>Devoir</span>
                                    {ex.deadline && (
                                      <span style={{ fontSize: 11, fontWeight: 500, color: isOverdue ? "#dc2626" : "#9ca3af", whiteSpace: "nowrap" }}>
                                        · {isOverdue ? "En retard —" : "À rendre le"} {fmtDeadline(ex.deadline)}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.title}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0891b2", background: "rgba(6,182,212,0.08)", padding: "5px 12px", borderRadius: 7, border: "1.5px solid rgba(6,182,212,0.22)" }}>Ouvrir</span>
                                  <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </motion.div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          </div>
        </div>
      )}

      {/* ─── TAB: ÉTUDIANTS ──────────────────────────────────────────────────── */}


        </motion.div>
      </AnimatePresence>


<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
