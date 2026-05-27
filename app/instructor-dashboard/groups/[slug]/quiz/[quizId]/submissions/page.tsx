"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, BrainCircuit, AlertCircle, Users, Check, X,
  ChevronDown, ChevronRight, Trophy, TrendingUp, Clock,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ─────────────────────────────────────────────────────────────────────

type Answer   = { id: string; text: string; isCorrect: boolean; order: number }
type Question = { id: string; text: string; order: number; answers: Answer[] }
type Student  = { id: string; name: string; surname: string; email: string; avatar: string | null } | null
type Submission = {
  id: string
  studentId: string
  student: Student
  score: number
  total: number
  answersJson: Record<string, string[]>
  submittedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function initials(name: string, surname: string) {
  return ((name[0] || "") + (surname[0] || "")).toUpperCase() || "?"
}

function avatarColor(label: string) {
  return ["var(--accent)", "var(--accent)", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"][label.charCodeAt(0) % 7]
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const color = pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444"
  const bg    = pct === 100 ? "#f0fdf4" : pct >= 60 ? "#fffbeb" : "#fef2f2"
  const border= pct === 100 ? "#86efac" : pct >= 60 ? "#fde68a" : "#fecaca"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, background: bg, border: `1.5px solid ${border}`, flexShrink: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 900, color }}>{score}/{total}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, opacity: 0.75 }}>{pct}%</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function QuizSubmissionsPage() {
  const { slug, quizId } = useParams<{ slug: string; quizId: string }>()
  const router = useRouter()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [questions, setQuestions]     = useState<Question[]>([])
  const [quizTitle, setQuizTitle]     = useState("")
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState("")
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!quizId || !slug) return
    const load = async () => {
      try {
        const [subRes, quizRes] = await Promise.all([
          fetch(`/api/instructor/groups/${slug}/quiz/${quizId}/submissions`).then(r => r.json()),
          fetch(`/api/instructor/groups/${slug}/quiz?quizId=${quizId}`).then(r => r.json()),
        ])
        if (subRes.ok) setSubmissions(subRes.submissions || [])
        else setError(subRes.error || "Erreur")
        if (quizRes.ok) {
          setQuizTitle(quizRes.quiz.title || "Quiz")
          setQuestions(quizRes.quiz.questions || [])
        }
      } catch {
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quizId, slug])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Stats
  const avg = submissions.length > 0
    ? Math.round(submissions.reduce((s, sub) => s + (sub.total > 0 ? (sub.score / sub.total) * 100 : 0), 0) / submissions.length)
    : null
  const perfect = submissions.filter(s => s.score === s.total).length

  if (loading) return <LoadingBI />

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f8fafc", fontFamily: "'Geist', 'Inter', sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #e8ecf3", background: "#fff", flexShrink: 0 }}>
            <button
              onClick={() => router.back()}
              style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{quizTitle} — Soumissions</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{submissions.length} soumission{submissions.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Stats bar */}
              {submissions.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {[
                    { icon: Users, label: "Étudiants", value: String(submissions.length), color: "var(--accent)", bg: "color-mix(in oklch, var(--accent) 8%, transparent)", border: "color-mix(in oklch, var(--accent) 22%, transparent)" },
                    { icon: TrendingUp, label: "Moyenne", value: avg != null ? `${avg}%` : "—", color: "var(--accent)", bg: "color-mix(in oklch, var(--accent) 8%, transparent)", border: "color-mix(in oklch, var(--accent) 22%, transparent)" },
                    { icon: Trophy, label: "Scores parfaits", value: String(perfect), color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
                  ].map(({ icon: Icon, label, value, color, bg, border }) => (
                    <div key={label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf3", padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={18} color={color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginTop: 3 }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
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
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Aucun étudiant n'a encore complété ce quiz.</p>
                </div>
              )}

              {/* Submission list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {submissions.map(sub => {
                  const isOpen = expanded.has(sub.id)
                  const s = sub.student
                  const displayName = s ? `${s.name} ${s.surname}`.trim() || s.email : sub.studentId
                  const pct = sub.total > 0 ? Math.round((sub.score / sub.total) * 100) : 0

                  return (
                    <div key={sub.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>

                      {/* Row */}
                      <div
                        onClick={() => toggleExpand(sub.id)}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
                      >
                        {/* Avatar */}
                        {s?.avatar ? (
                          <img src={s.avatar} alt="" style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: avatarColor(displayName), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                            {s ? initials(s.name, s.surname) : "?"}
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{displayName}</div>
                          {s?.email && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{s.email}</div>}
                        </div>

                        {/* Score progress bar */}
                        <div style={{ width: 120, flexShrink: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#64748b" }}>Score</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 60 ? "#0f172a" : "#ef4444" }}>{pct}%</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444", transition: "width 0.4s" }} />
                          </div>
                        </div>

                        <ScoreBadge score={sub.score} total={sub.total} />

                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          <Clock size={11} color="#94a3b8" />
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(sub.submittedAt)}</span>
                        </div>

                        {isOpen ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                      </div>

                      {/* Expanded: per-question review */}
                      {isOpen && (
                        <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                          {questions.length === 0 && (
                            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Chargement des questions…</p>
                          )}
                          {questions.map((q, qi) => {
                            const sel = new Set(sub.answersJson[q.id] || [])
                            const correctIds = new Set(q.answers.filter(a => a.isCorrect).map(a => a.id))
                            const allRight = [...correctIds].every(id => sel.has(id)) && [...sel].every(id => correctIds.has(id))

                            return (
                              <div key={q.id} style={{ borderRadius: 12, border: `1.5px solid ${allRight ? "#86efac" : "#fca5a5"}`, overflow: "hidden" }}>
                                {/* Question header */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: allRight ? "#f0fdf4" : "#fef2f2" }}>
                                  <div style={{ width: 24, height: 24, borderRadius: 7, background: allRight ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {allRight ? <Check size={12} color="#fff" strokeWidth={3} /> : <X size={12} color="#fff" strokeWidth={3} />}
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>Q{qi + 1}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", flex: 1 }}>{q.text}</span>
                                </div>

                                {/* Answers */}
                                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, background: "#fff" }}>
                                  {q.answers.map((ans, ai) => {
                                    const wasSel = sel.has(ans.id)
                                    const bg     = ans.isCorrect ? "#f0fdf4" : wasSel ? "#fef2f2" : "#f8fafc"
                                    const border = ans.isCorrect ? "#86efac" : wasSel ? "#fca5a5" : "#e8ecf3"
                                    const textColor = ans.isCorrect ? "#15803d" : wasSel ? "#dc2626" : "#64748b"
                                    return (
                                      <div key={ans.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, background: bg, border: `1px solid ${border}` }}>
                                        <div style={{ width: 18, height: 18, borderRadius: 5, background: ans.isCorrect ? "#22c55e" : wasSel ? "#ef4444" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                          {ans.isCorrect ? <Check size={10} color="#fff" strokeWidth={3} /> : wasSel ? <X size={10} color="#fff" strokeWidth={3} /> : null}
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", width: 16 }}>{String.fromCharCode(65 + ai)}</span>
                                        <span style={{ fontSize: 13, fontWeight: ans.isCorrect || wasSel ? 600 : 400, color: textColor, flex: 1 }}>{ans.text}</span>
                                        {ans.isCorrect && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 800, letterSpacing: "0.04em" }}>CORRECT</span>}
                                        {wasSel && !ans.isCorrect && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 800, letterSpacing: "0.04em" }}>SÉLECTIONNÉ</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
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
