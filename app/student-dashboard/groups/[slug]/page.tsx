"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronRight, BookOpen, Layers, Users, GraduationCap, Video,
  FileText, AlertCircle, LayoutList, Clock, Calendar,
  ExternalLink, Play,
  ChevronDown, Paperclip, ClipboardList, ClipboardCheck, Upload, X, Check, Loader2, MessageSquare,
} from "lucide-react"
import GroupKpiCard from "@/components/groups/GroupKpiCard"
import LoadingBI from "@/components/LoadingBI"
import { STATUS_META, fmtDate, initials, avatarColor, type GroupStatus } from "@/components/groups/groupUtils"

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = "overview" | "etudiants" | "seances"
const TAB_ORDER: Tab[] = ["overview", "etudiants", "seances"]

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
  program: Program | null
  nextSession?: { id: string; title: string | null; date: string; start_time: string; mode: string; joinUrl: string | null } | null
  nextSessions?: { id: string; title: string | null; date: string; start_time: string; mode: string; joinUrl: string | null }[] | null
  pastSessions?: { id: string; title: string | null; date: string; start_time: string; mode: string; joinUrl: string | null; recordingUrl: string | null; googleEventId: string | null }[] | null
}

type Module      = { id: string; title: string; order: number; description: string }
type Lesson      = { id: string; moduleId: string; title: string; order: number; description: string; content: string }
type LessonVideo = { id: string; lessonId: string; title: string; driveUrl: string; description: string }
type Attachment  = { id: string; lessonId?: string; videoId?: string; name: string; url: string | null }
type ModuleVideo = { id: string; moduleId: string; title: string; driveUrl: string; description: string; order: number }
type ModuleAttachment = { id: string; moduleId: string; name: string; url: string | null; order?: number }

type HomeworkAttachment = { id: string; name: string; url: string | null }
type SubmissionFile     = { id: string; name: string; url: string | null }
type HomeworkSubmission = { id: string; submittedAt: string; files: SubmissionFile[] }
type HomeworkItem = {
  id: string
  moduleId: string
  title: string
  text: string
  deadline: string | null
  attachments: HomeworkAttachment[]
  submission: HomeworkSubmission | null
}

// ── Main Page ──────────────────────────────────────────────────────────────────

function isPdf(name: string) { return name.split(".").pop()?.toLowerCase() === "pdf" }

function sessMinutesUntil(sess: { date: string; start_time: string } | null | undefined): number {
  if (!sess) return Infinity
  const [y, m, d] = sess.date.split("-").map(Number)
  const [h, min] = (sess.start_time || "00:00").split(":").map(Number)
  return (new Date(y, m - 1, d, h, min).getTime() - Date.now()) / 60000
}

function todayYMD() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
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
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [group,              setGroup]              = useState<Group | null>(null)
  const [todaySession,       setTodaySession]       = useState<{ id: string; title: string | null; date: string; start_time: string; mode: string; joinUrl: string | null } | null>(null)
  const [modules,            setModules]            = useState<Module[]>([])
  const [lessons,            setLessons]            = useState<Lesson[]>([])
  const [lessonVideos,       setLessonVideos]       = useState<LessonVideo[]>([])
  const [lessonAttachments,  setLessonAttachments]  = useState<Attachment[]>([])
  const [moduleVideos,       setModuleVideos]       = useState<ModuleVideo[]>([])
  const [moduleAttachments,  setModuleAttachments]  = useState<ModuleAttachment[]>([])
  const [homework,           setHomework]           = useState<HomeworkItem[]>([])
  const [loading,            setLoading]            = useState(true)
  const [activeTab,          setActiveTab]          = useState<Tab>("overview")
  const [expandedModules,    setExpandedModules]    = useState<Set<string>>(new Set())
  const [expandedHomeworkId, setExpandedHomeworkId] = useState<string | null>(null)
  const [submittingHwId,     setSubmittingHwId]     = useState<string | null>(null)
  const [pendingFiles,       setPendingFiles]       = useState<File[]>([])
  const [toRemoveFileIds,    setToRemoveFileIds]    = useState<string[]>([])
  const [loadError,          setLoadError]          = useState("")
  const hwSubmitRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tabFromQuery = parseTab(searchParams.get("view")) ?? "overview"
    setActiveTab(prev => (prev === tabFromQuery ? prev : tabFromQuery))
  }, [searchParams])

  const setActiveTabWithRoute = useCallback((tab: Tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)

    const params = new URLSearchParams(searchParams.toString())
    if (tab === "overview") params.delete("view")
    else params.set("view", tab)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [activeTab, pathname, router, searchParams])

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
        const studentId = getStudentId()
        const hwUrl = `/api/student/groups/${groupId}/homework${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`
        const [gRes, cRes, hwRes] = await Promise.all([
          fetch(`/api/student/groups/${groupId}`),
          fetch(`/api/student/groups/${groupId}/curriculum`),
          fetch(hwUrl),
        ])
        if (gRes.status === 401 || cRes.status === 401 || hwRes.status === 401) {
          localStorage.removeItem("user")
          router.replace(`/login?next=/student-dashboard/groups/${groupId}`)
          return
        }
        if (gRes.status === 403 || cRes.status === 403 || hwRes.status === 403) {
          setLoadError("Acces refuse. Reconnectez-vous puis reessayez.")
          return
        }
        if (gRes.ok) {
          const d = await gRes.json()
          if (d.ok) {
            setGroup({ ...d.group, nextSession: d.nextSession, nextSessions: d.nextSessions, pastSessions: d.pastSessions })
            setTodaySession(d.todaySession || null)
          }
        } else {
          const d = await gRes.json().catch(() => ({}))
          setLoadError(d?.error || "Groupe introuvable")
        }
        if (cRes.ok) {
          const d = await cRes.json()
          if (d.ok) {
            setModules(d.modules || [])
            setLessons(d.lessons || [])
            setLessonVideos(d.videos || [])
            setLessonAttachments(d.lessonAttachments || [])
            setModuleVideos(d.moduleVideos || [])
            setModuleAttachments(d.moduleAttachments || [])
            if ((d.modules || []).length > 0) setExpandedModules(new Set([(d.modules[0] as Module).id]))
          }
        }
        if (hwRes.ok) {
          const d = await hwRes.json()
          if (d.ok) setHomework(d.homework || [])
        }
      } catch {
        setLoadError("Erreur lors du chargement du groupe.")
      }
      finally { setLoading(false) }
    }
    load()
  }, [groupId])

  async function submitHomework(hw: HomeworkItem) {
    const studentId = getStudentId()
    if (!studentId) return
    setSubmittingHwId(hw.id)
    try {
      const fd = new FormData()
      fd.append("studentId", studentId)
      for (const f of pendingFiles) fd.append("files", f)

      let url = `/api/student/groups/${groupId}/homework/${hw.id}/submit`
      let method = "POST"
      if (hw.submission) {
        method = "PATCH"
        if (toRemoveFileIds.length > 0) fd.append("deleteFileIds", JSON.stringify(toRemoveFileIds))
      }

      const res = await fetch(url, { method, body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      setHomework(p => p.map(h => h.id === hw.id ? { ...h, submission: d.submission } : h))
      setPendingFiles([])
      setToRemoveFileIds([])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmittingHwId(null)
    }
  }

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
  const nextSess = group.nextSession
  const nextSessions = (group.nextSessions && group.nextSessions.length > 0)
    ? group.nextSessions
    : (nextSess ? [nextSess] : [])
  const relevantSess = nextSess ?? todaySession
  const minsUntil = sessMinutesUntil(relevantSess)
  const showBanner = !!relevantSess && relevantSess.date === todayYMD() && minsUntil <= 5
  const hasLiveNext = showBanner
  const sortedModules = [...modules].sort((a, b) => a.order - b.order)

  // Build the unified item list per module (same structure as instructor)
  function buildModuleItems(moduleId: string) {
    const mLessons = lessons.filter(l => l.moduleId === moduleId).sort((a, b) => a.order - b.order)
    const mVideos  = moduleVideos.filter(v => v.moduleId === moduleId).sort((a, b) => a.order - b.order)
    const mAtts    = moduleAttachments.filter(a => a.moduleId === moduleId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    type Item =
      | { itype: "lesson"; id: string; order: number; key: string }
      | { itype: "module_video"; id: string; order: number; key: string }
      | { itype: "module_attachment"; id: string; order: number; key: string }
    const items: Item[] = [
      ...mLessons.map(l => ({ itype: "lesson" as const, id: l.id, order: l.order, key: `lesson:${l.id}` })),
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

          <nav style={{ display: "flex", gap: 2 }}>
            {([
              { id: "overview",  label: "Vue d'ensemble", icon: LayoutList },
              { id: "etudiants", label: "Étudiants",       icon: Users,     count: group.students.length },
              { id: "seances",   label: "Séances",         icon: Calendar,  count: group.pastSessions?.length || 0 },
            ] as { id: Tab; label: string; icon: React.ElementType; count?: number }[]).map(({ id, label, icon: Icon, count }) => {
              const isActive = activeTab === id
              return (
                <button key={id} onClick={() => setActiveTabWithRoute(id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px 10px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "color-mix(in oklch, var(--accent) 85%, black)" : "#6b7280", borderBottom: isActive ? "2.5px solid var(--accent)" : "2.5px solid transparent", marginBottom: -1, transition: "all 0.15s" }}>
                  <Icon size={13} />
                  {label}
                  {count !== undefined && count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", background: isActive ? "color-mix(in oklch, var(--accent) 12%, transparent)" : "#f3f4f6", color: isActive ? "color-mix(in oklch, var(--accent) 85%, black)" : "#6b7280", padding: "0 4px" }}>{count}</span>
                  )}
                </button>
              )
            })}
          </nav>
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
              { icon: Users,      value: group.students.length,       label: "Étudiants", iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: LayoutList, value: modules.length,              label: "Modules",   iconColor: "var(--accent)", iconBg: "color-mix(in oklch, var(--accent) 8%, transparent)" },
              { icon: FileText,   value: lessons.length,              label: "Leçons",    iconColor: "#10b981", iconBg: "rgba(16,185,129,0.08)" },
              { icon: Video,      value: lessonVideos.length + moduleVideos.length, label: "Vidéos", iconColor: "#f59e0b", iconBg: "rgba(245,158,11,0.08)" },
            ].map(card => <GroupKpiCard key={card.label} {...card} />)}
          </div>

          {/* Live session banner */}
          {hasLiveNext && relevantSess?.joinUrl && (
            <div style={{ background: "linear-gradient(135deg,color-mix(in oklch, var(--accent) 85%, black) 0%,#7c3aed 100%)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 8px 24px color-mix(in oklch, var(--accent) 25%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Video size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", padding: "2px 10px", borderRadius: 99, marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>PROCHAINE SÉANCE</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 4px", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>{relevantSess!.title || "Séance de formation"}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={12} /> {fmtDate(relevantSess!.date)} à {relevantSess!.start_time || "—"}
                  </p>
                </div>
              </div>
              {relevantSess!.joinUrl && (
                <button onClick={() => window.open(relevantSess!.joinUrl!, "_blank")} style={{ background: "#fff", color: "color-mix(in oklch, var(--accent) 85%, black)", border: "none", padding: "11px 20px", borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  <ExternalLink size={14} /> Rejoindre
                </button>
              )}
            </div>
          )}

          {/* Non-live next session */}
          {nextSess && nextSess.joinUrl && !hasLiveNext && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f4f6fb", border: "1px solid #e8ecf3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Calendar size={18} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Prochaine séance</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{nextSess.title || "Séance"}</p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={11} /> {fmtDate(nextSess.date)} à {nextSess.start_time || "—"}
                </p>
              </div>
            </div>
          )}

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

            {/* Right: instructor + sessions sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 104, alignSelf: "start" }}>
              {group.instructor && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Formateur</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    {group.instructor.avatar ? (
                      <img
                        src={group.instructor.avatar}
                        alt=""
                        style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0, border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)" }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: "50%", background: "color-mix(in oklch, var(--accent) 10%, transparent)", border: "2px solid color-mix(in oklch, var(--accent) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)" }}>
                        {initials(group.instructor.name, group.instructor.surname)}
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{[group.instructor.name, group.instructor.surname].filter(Boolean).join(" ")}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <GraduationCap size={11} /> Formateur
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("open-message-group", { detail: { groupId } }))}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "9px 14px", borderRadius: 10,
                      background: "color-mix(in oklch, var(--accent) 7%, transparent)",
                      border: "1.5px solid color-mix(in oklch, var(--accent) 20%, transparent)",
                      color: "color-mix(in oklch, var(--accent) 85%, black)",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 12%, transparent)"
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in oklch, var(--accent) 35%, transparent)"
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 7%, transparent)"
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in oklch, var(--accent) 20%, transparent)"
                    }}
                  >
                    <MessageSquare size={14} />
                    Envoyer un message
                  </button>
                </div>
              )}

              {/* Upcoming sessions */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 9, background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "color-mix(in oklch, var(--accent) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                    <Calendar size={13} strokeWidth={2} />
                  </div>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Séances à venir</h2>
                </div>
                {nextSessions.length === 0 ? (
                  <div style={{ padding: "22px 18px", textAlign: "center" }}>
                    <Calendar size={24} color="#e2e8f0" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Aucune séance planifiée</p>
                  </div>
                ) : (
                  <div style={{ padding: "8px 0" }}>
                    {nextSessions.slice(0, 3).map((session, idx) => {
                      const sessionDate = new Date(session.date + "T00:00:00")
                      const isToday = sessionDate.toDateString() === new Date().toDateString()
                      return (
                        <div key={session.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 18px", borderBottom: idx < Math.min(nextSessions.length, 3) - 1 ? "1px solid #f8fafc" : "none" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: isToday ? "color-mix(in oklch, var(--accent) 10%, transparent)" : "#f8fafc", border: `1.5px solid ${isToday ? "color-mix(in oklch, var(--accent) 20%, transparent)" : "#f1f5f9"}` }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: isToday ? "var(--accent)" : "#0f172a", lineHeight: 1 }}>{sessionDate.getDate()}</span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", lineHeight: 1, marginTop: 1 }}>{sessionDate.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.title || "Séance"}</p>
                            <p style={{ fontSize: 11, color: "#475569", margin: "1px 0 0" }}>{session.start_time ? session.start_time.slice(0, 5) : "—"} · {fmtDate(session.date)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Accès rapide</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {([
                    { label: "Étudiants",  tab: "etudiants" as Tab, icon: Users  },
                    { label: "Historique", tab: "seances" as Tab,   icon: Clock  },
                  ]).map(({ label, tab, icon: Icon }) => (
                    <button key={tab} onClick={() => setActiveTabWithRoute(tab)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 9, border: "1px solid #f3f4f6", background: "#fafafa", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 6%, white)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in oklch, var(--accent) 20%, transparent)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fafafa"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#f3f4f6" }}
                    >
                      <Icon size={13} color="var(--accent)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
                      <ChevronRight size={12} style={{ color: "#d1d5db", marginLeft: "auto" }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          {/* ── Programme — same card design as instructor, read-only ── */}
          <div style={{ position: "relative", paddingLeft: 16 }}>
            <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: "linear-gradient(to bottom, var(--accent), color-mix(in oklch, var(--accent) 60%, white))", borderRadius: 99 }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Programme</span>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
              <span style={{ color: "#d1d5db", fontSize: 13 }}>·</span>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{lessons.length} leçon{lessons.length !== 1 ? "s" : ""}</span>
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
                  const modLessonsCount = lessons.filter(l => l.moduleId === mod.id).length
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
                            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{modLessonsCount} leçon{modLessonsCount !== 1 ? "s" : ""}</span>
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
                            if (item.itype === "lesson") {
                              const lesson = lessons.find(l => l.id === item.id)!
                              return (
                                <div key={item.key} style={{ ...baseRow, cursor: "pointer" }}
                                  onClick={() => router.push(`/student-dashboard/groups/${groupId}/lessons/${lesson.id}`)}
                                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.05)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                                >
                                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }}>
                                    <BookOpen size={16} strokeWidth={2.5} color="#fff" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Leçon</div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lesson.title}</span>
                                  </div>
                                  {(() => {
                                    const vids = lessonVideos.filter(v => v.lessonId === lesson.id)
                                    const atts = lessonAttachments.filter(a => a.lessonId === lesson.id)
                                    return (
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {vids.length > 0 && <span style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}><Video size={11} /> {vids.length}</span>}
                                        {atts.length > 0 && <span style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}><Paperclip size={11} /> {atts.length}</span>}
                                      </div>
                                    )
                                  })()}
                                </div>
                              )
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
                                  {vid.driveUrl && (
                                    <a href={vid.driveUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "3px 5px", color: "#9ca3af", borderRadius: 5, display: "flex", alignItems: "center", textDecoration: "none", transition: "color 0.12s" }}
                                      onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                                      onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                                    ><ExternalLink size={12} /></a>
                                  )}
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
                                onClick={() => { if (pdfUrl) router.push(pdfUrl) }}
                                style={{ ...baseRow, cursor: pdfUrl ? "pointer" : "default" }}
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
                                {att.url && !pdfUrl && (
                                  <a href={att.url} target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{ padding: "3px 5px", color: "#9ca3af", borderRadius: 5, display: "flex", alignItems: "center", textDecoration: "none", transition: "color 0.12s" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                                  ><ExternalLink size={12} /></a>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {allItems.length === 0 && homework.filter(h => h.moduleId === mod.id).length === 0 && (
                        <div style={{ padding: "20px 18px", textAlign: "center" }}>
                          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Aucun contenu pour ce module</p>
                        </div>
                      )}

                      {/* ── Homework items ── */}
                      {homework.filter(h => h.moduleId === mod.id).map(hw => {
                        const isExpHw    = expandedHomeworkId === hw.id
                        const deadlinePassed = hw.deadline ? new Date(hw.deadline) < new Date() : false
                        const hasSubmission  = !!hw.submission
                        const isSubmitting   = submittingHwId === hw.id
                        const canModify      = !deadlinePassed

                        return (
                          <div key={hw.id} style={{ borderTop: "1px solid #f0f1f5" }}>
                            {/* Row */}
                            <div
                              style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", cursor: "pointer", transition: "background 0.12s" }}
                              onClick={() => {
                                setExpandedHomeworkId(isExpHw ? null : hw.id)
                                setPendingFiles([])
                                setToRemoveFileIds([])
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fff8f0"}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                            >
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: hasSubmission ? "#10b981" : "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: hasSubmission ? "0 2px 8px rgba(16,185,129,0.35)" : "0 2px 8px rgba(139,92,246,0.35)" }}>
                                {hasSubmission ? <ClipboardCheck size={16} strokeWidth={2.5} color="#fff" /> : <ClipboardList size={16} strokeWidth={2.5} color="#fff" />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: hasSubmission ? "#059669" : "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>{hasSubmission ? "Exercice · Rendu" : "Exercice"}</div>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hw.title}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                                  {hw.deadline && (
                                    <span style={{ fontSize: 11, color: deadlinePassed ? "#ef4444" : "#f59e0b", display: "flex", alignItems: "center", gap: 3 }}>
                                      <Clock size={10} />
                                      {new Date(hw.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                      {deadlinePassed ? " — Expiré" : ""}
                                    </span>
                                  )}
                                  {hasSubmission && (
                                    <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>Rendu</span>
                                  )}
                                </div>
                              </div>
                              <ChevronDown size={14} style={{ color: "#9ca3af", transition: "transform 0.2s", transform: isExpHw ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }} />
                            </div>

                            {/* Expanded detail + submission */}
                            {isExpHw && (
                              <div style={{ padding: "0 20px 16px 68px", display: "flex", flexDirection: "column", gap: 12, background: "#fffbf5", borderTop: "1px solid #fef3c7" }}>
                                {hw.text && (
                                  <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{hw.text}</p>
                                )}

                                {/* Deadline pill */}
                                {hw.deadline && (
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: deadlinePassed ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.1)", border: `1px solid ${deadlinePassed ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.3)"}`, width: "fit-content" }}>
                                    <Clock size={11} color={deadlinePassed ? "#ef4444" : "#f59e0b"} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: deadlinePassed ? "#ef4444" : "#92400e" }}>
                                      Deadline : {new Date(hw.deadline).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      {deadlinePassed ? " (expiré)" : ""}
                                    </span>
                                  </div>
                                )}

                                {/* Instructor attachments */}
                                {hw.attachments.length > 0 && (
                                  <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fichiers du formateur</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                      {hw.attachments.map(att => (
                                        <a key={att.id} href={att.url || "#"} target="_blank" rel="noopener noreferrer"
                                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", borderRadius: 8, border: "1px solid #f3f4f6", textDecoration: "none", transition: "background 0.12s" }}
                                          onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                                          onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                                        >
                                          <Paperclip size={12} color="#9ca3af" />
                                          <span style={{ flex: 1, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                                          <ExternalLink size={11} color="#9ca3af" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Submission section */}
                                <div>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    {hasSubmission ? "Votre rendu" : "Rendre le devoir"}
                                  </p>

                                  {/* Submitted files */}
                                  {hasSubmission && hw.submission!.files.length > 0 && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                                      {hw.submission!.files
                                        .filter(f => !toRemoveFileIds.includes(f.id))
                                        .map(f => (
                                          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                                            <Check size={12} color="#10b981" />
                                            {f.url ? (
                                              <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12, color: "#065f46", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</a>
                                            ) : (
                                              <span style={{ flex: 1, fontSize: 12, color: "#065f46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                            )}
                                            {canModify && (
                                              <button onClick={() => setToRemoveFileIds(p => [...p, f.id])}
                                                style={{ padding: "2px 4px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#86efac", transition: "color 0.12s" }}
                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#86efac"}
                                              ><X size={11} /></button>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  )}

                                  {/* Pending new files */}
                                  {pendingFiles.length > 0 && expandedHomeworkId === hw.id && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                                      {pendingFiles.map((f, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fefce8", borderRadius: 8, border: "1px solid #fde68a" }}>
                                          <Upload size={12} color="#f59e0b" />
                                          <span style={{ flex: 1, fontSize: 12, color: "#92400e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                          <button onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}
                                            style={{ padding: "2px 4px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#fbbf24", transition: "color 0.12s" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#fbbf24"}
                                          ><X size={11} /></button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {canModify ? (
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                      <button onClick={() => hwSubmitRef.current?.click()}
                                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#fff", border: "1.5px dashed #fbbf24", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#92400e", cursor: "pointer", transition: "all 0.15s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fffbeb"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#f59e0b" }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#fbbf24" }}
                                      ><Upload size={12} /> Ajouter des fichiers</button>
                                      {(pendingFiles.length > 0 || toRemoveFileIds.length > 0) && (
                                        <button onClick={() => submitHomework(hw)} disabled={isSubmitting}
                                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#10b981", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
                                        >{isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {hasSubmission ? "Mettre à jour" : "Soumettre"}</button>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                      <Clock size={12} color="#ef4444" />
                                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>La deadline est passée — plus de modifications possibles</span>
                                    </div>
                                  )}

                                  {!hasSubmission && !canModify && (
                                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0" }}>Vous n'avez pas rendu ce devoir.</p>
                                  )}
                                </div>
                              </div>
                            )}
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

          {/* Homework with no matching module (safety net) */}
          {(() => {
            const moduleIds = new Set(sortedModules.map(m => m.id))
            const orphans = homework.filter(h => !moduleIds.has(h.moduleId))
            if (orphans.length === 0) return null
            return (
              <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #fde68a", overflow: "hidden", marginTop: 4 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #fef3c7", display: "flex", alignItems: "center", gap: 8, background: "#fffbeb" }}>
                  <ClipboardList size={14} color="#f59e0b" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Devoirs</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "#fef3c7", borderRadius: 99, padding: "2px 8px" }}>{orphans.length}</span>
                </div>
                {orphans.map(hw => {
                  const isExpHw = expandedHomeworkId === hw.id
                  const deadlinePassed = hw.deadline ? new Date(hw.deadline) < new Date() : false
                  const hasSubmission = !!hw.submission
                  const isSubmitting = submittingHwId === hw.id
                  const canModify = !deadlinePassed
                  return (
                    <div key={hw.id} style={{ borderTop: "1px solid #fef3c7" }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", cursor: "pointer", transition: "background 0.12s" }}
                        onClick={() => { setExpandedHomeworkId(isExpHw ? null : hw.id); setPendingFiles([]); setToRemoveFileIds([]) }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fffbeb"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: hasSubmission ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {hasSubmission ? <ClipboardCheck size={16} strokeWidth={2.5} color="#fff" /> : <ClipboardList size={16} strokeWidth={2.5} color="#fff" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hw.title}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                            {hw.deadline && (
                              <span style={{ fontSize: 11, color: deadlinePassed ? "#ef4444" : "#f59e0b", display: "flex", alignItems: "center", gap: 3 }}>
                                <Clock size={10} /> {new Date(hw.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                {deadlinePassed ? " — Expiré" : ""}
                              </span>
                            )}
                            {hasSubmission && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>Rendu</span>}
                          </div>
                        </div>
                        <ChevronDown size={14} style={{ color: "#9ca3af", transition: "transform 0.2s", transform: isExpHw ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }} />
                      </div>
                      {isExpHw && (
                        <div style={{ padding: "0 20px 16px 68px", display: "flex", flexDirection: "column", gap: 12, background: "#fffbf5", borderTop: "1px solid #fef3c7" }}>
                          {hw.text && <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{hw.text}</p>}
                          {canModify ? (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <button onClick={() => hwSubmitRef.current?.click()}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#fff", border: "1.5px dashed #fbbf24", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#92400e", cursor: "pointer" }}
                              ><Upload size={12} /> Ajouter des fichiers</button>
                              {(pendingFiles.length > 0 || toRemoveFileIds.length > 0) && (
                                <button onClick={() => submitHomework(hw)} disabled={isSubmitting}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#10b981", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", cursor: isSubmitting ? "not-allowed" : "pointer" }}
                                >{isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {hasSubmission ? "Mettre à jour" : "Soumettre"}</button>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                              <Clock size={12} color="#ef4444" />
                              <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>Délai expiré</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
          </div>
        </div>
      )}

      {/* ─── TAB: ÉTUDIANTS ──────────────────────────────────────────────────── */}
      {activeTab === "etudiants" && (
        <div style={{ padding: "24px 28px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Étudiants inscrits</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: "color-mix(in oklch, var(--accent) 85%, black)", background: "color-mix(in oklch, var(--accent) 8%, transparent)", padding: "2px 10px", borderRadius: 99, border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)" }}>{group.students.length}</span>
          </div>
          {group.students.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "56px 24px", textAlign: "center" }}>
              <Users size={36} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Aucun étudiant inscrit dans ce groupe</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {group.students.map(s => (
                <div key={s.id}
                  style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "16px 18px", display: "flex", alignItems: "center", gap: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)" }}
                >
                  {s.avatar ? (
                    <img src={s.avatar} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(s.id), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {initials(s.name, s.surname)}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[s.name, s.surname].filter(Boolean).join(" ") || s.username || "—"}
                    </p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: SÉANCES ────────────────────────────────────────────────────── */}
      {activeTab === "seances" && (
        <div style={{ padding: "24px 28px 64px" }}>
          {nextSess && nextSess.joinUrl && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Prochaine séance</h2>
              <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid color-mix(in oklch, var(--accent) 20%, white)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 16px color-mix(in oklch, var(--accent) 7%, transparent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in oklch, var(--accent) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Calendar size={20} color="var(--accent)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{nextSess.title || "Séance de formation"}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={12} /> {fmtDate(nextSess.date)} à {nextSess.start_time || "—"}
                    </p>
                  </div>
                </div>
                {hasLiveNext && nextSess.joinUrl && (
                  <button onClick={() => window.open(nextSess.joinUrl!, "_blank")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <ExternalLink size={13} /> Rejoindre
                  </button>
                )}
              </div>
            </div>
          )}

          {group.pastSessions && group.pastSessions.length > 0 && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Historique ({group.pastSessions.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.pastSessions.map(s => (
                  <div key={s.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8ecf3", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f4f6fb", border: "1px solid #e8ecf3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Video size={15} color="#6b7280" />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 3px" }}>{s.title || "Séance"}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={10} /> {fmtDate(s.date)} à {s.start_time || "—"}
                        </p>
                      </div>
                    </div>
                    {s.recordingUrl ? (
                      <button onClick={() => window.open(s.recordingUrl!, "_blank")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "color-mix(in oklch, var(--accent) 7%, transparent)", color: "color-mix(in oklch, var(--accent) 85%, black)", border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 12%, transparent)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "color-mix(in oklch, var(--accent) 7%, transparent)")}
                      >
                        <Play size={12} /> Voir l'enregistrement
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#9ca3af", padding: "7px 14px" }}>Pas encore disponible</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!nextSess && (!group.pastSessions || group.pastSessions.length === 0) && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0", padding: "56px 24px", textAlign: "center" }}>
              <Calendar size={36} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Aucune séance planifiée pour ce groupe</p>
            </div>
          )}
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Hidden file input for homework submissions */}
      <input
        ref={hwSubmitRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={e => {
          const files = Array.from(e.target.files || [])
          setPendingFiles(p => [...p, ...files])
          e.target.value = ""
        }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
