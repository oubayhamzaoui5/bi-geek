"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, BrainCircuit, Check, X, AlertCircle, ChevronRight, ChevronLeft,
  Clock, Lock, Loader2,
} from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

// ── Types ─────────────────────────────────────────────────────────────────────

type Answer   = { id: string; text: string; isCorrect: boolean; order: number }
type Question = { id: string; text: string; imageUrl: string | null; order: number; answers: Answer[] }
type Quiz     = { id: string; title: string; deadline: string | null; questions: Question[] }
type Submission = { id: string; score: number; total: number; submittedAt: string; answersJson?: Record<string, string[]> }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStudentId() {
  try {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    const id = u?.id ?? u?.record?.id ?? u?.user?.id ?? ""
    return typeof id === "string" ? id.trim() : ""
  } catch { return "" }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const ANSWER_STYLES = [
  { bg: "#fff1f2", border: "#fecdd3", text: "#9f1239", active: "#e11d48", label: "A" },
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", active: "#2563eb", label: "B" },
  { bg: "#fffbeb", border: "#fde68a", text: "#92400e", active: "#d97706", label: "C" },
  { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", active: "#16a34a", label: "D" },
  { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9", active: "#7c3aed", label: "E" },
  { bg: "#ecfeff", border: "#a5f3fc", text: "#0e7490", active: "#0891b2", label: "F" },
]

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentQuizPage() {
  const { slug, quizId } = useParams<{ slug: string; quizId: string }>()
  const router = useRouter()

  const [quiz, setQuiz]               = useState<Quiz | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState("")
  const [submission, setSubmission]   = useState<Submission | null>(null)
  const [submitting, setSubmitting]   = useState(false)

  // Quiz state
  const [step, setStep]     = useState<"intro" | "question" | "result">("intro")
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})

  const studentId = getStudentId()

  useEffect(() => {
    if (!quizId || !slug) return
    const load = async () => {
      try {
        const [quizRes, subRes] = await Promise.all([
          fetch(`/api/student/groups/${slug}/quiz?quizId=${quizId}`).then(r => r.json()),
          studentId
            ? fetch(`/api/student/groups/${slug}/quiz/${quizId}/submit?studentId=${studentId}`).then(r => r.json())
            : Promise.resolve({ ok: true, submission: null }),
        ])
        if (quizRes.ok) setQuiz(quizRes.quiz)
        else setError(quizRes.error || "Quiz introuvable")
        if (subRes.ok && subRes.submission) {
          setSubmission(subRes.submission)
          if (subRes.submission.answersJson) {
            const restored: Record<string, Set<string>> = {}
            for (const [qId, ids] of Object.entries(subRes.submission.answersJson as Record<string, string[]>)) {
              restored[qId] = new Set(ids)
            }
            setSelected(restored)
          }
          setStep("result")
        }
      } catch {
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quizId, slug, studentId])

  function toggleAnswer(qId: string, aId: string) {
    if (submission) return
    setSelected(prev => {
      const cur = new Set(prev[qId] || [])
      if (cur.has(aId)) cur.delete(aId)
      else cur.add(aId)
      return { ...prev, [qId]: cur }
    })
  }

  function calcScore() {
    if (!quiz) return { correct: 0, total: 0 }
    let correct = 0
    for (const q of quiz.questions) {
      const sel = selected[q.id] || new Set()
      const correctIds = new Set(q.answers.filter(a => a.isCorrect).map(a => a.id))
      const allRight = [...correctIds].every(id => sel.has(id)) && [...sel].every(id => correctIds.has(id))
      if (allRight) correct++
    }
    return { correct, total: quiz.questions.length }
  }

  async function handleSubmit() {
    if (!quiz || !studentId) { setStep("result"); return }
    const score = calcScore()
    setSubmitting(true)
    try {
      const answersJson: Record<string, string[]> = {}
      for (const [qId, sel] of Object.entries(selected)) {
        answersJson[qId] = [...sel]
      }
      const res = await fetch(`/api/student/groups/${slug}/quiz/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, score: score.correct, total: score.total, answersJson }),
      })
      const d = await res.json()
      if (d.ok) setSubmission(d.submission)
    } catch {}
    setStep("result")
    setSubmitting(false)
  }

  if (loading) return <LoadingBI />

  if (error || !quiz) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>
        <div style={{ textAlign: "center", background: "#fff", border: "1px solid #e8ecf3", borderRadius: 18, padding: "40px 44px", boxShadow: "0 8px 32px rgba(15,23,42,0.08)" }}>
          <AlertCircle size={40} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
          <p style={{ color: "#64748b", margin: 0 }}>{error || "Quiz introuvable"}</p>
          <button onClick={() => router.back()} style={{ marginTop: 18, padding: "10px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Retour</button>
        </div>
      </div>
    )
  }

  const deadlinePassed = quiz.deadline ? new Date(quiz.deadline) < new Date() : false
  const activeQ = quiz.questions[qIndex]

  // Use saved submission score if available, otherwise compute from current answers
  const score = submission
    ? { correct: submission.score, total: submission.total }
    : calcScore()
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb", fontFamily: "var(--ff-body,'DM Sans',sans-serif)", display: "flex", flexDirection: "column" }}>
      <header style={{ height: 64, padding: "0 28px", background: "#fff", borderBottom: "1px solid #e8ecf3", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px color-mix(in oklch, var(--accent) 24%, transparent)" }}>
          <BrainCircuit size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quiz.title}</div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""}</div>
        </div>
        {step === "question" && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>{qIndex + 1} / {quiz.questions.length}</span>
            <div style={{ width: 180, height: 8, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "var(--accent)", width: `${((qIndex + 1) / quiz.questions.length) * 100}%`, transition: "width 0.25s" }} />
            </div>
          </div>
        )}
        {quiz.deadline && step !== "result" && (
          <div style={{ marginLeft: step === "question" ? 8 : "auto", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: deadlinePassed ? "#fef2f2" : "#fffbeb", border: `1px solid ${deadlinePassed ? "#fecaca" : "#fde68a"}` }}>
            <Clock size={12} color={deadlinePassed ? "#dc2626" : "#d97706"} />
            <span style={{ fontSize: 11, fontWeight: 800, color: deadlinePassed ? "#dc2626" : "#d97706" }}>{deadlinePassed ? "Delai depasse" : fmtDate(quiz.deadline)}</span>
          </div>
        )}
      </header>

      <main style={{ flex: 1, overflow: "auto", padding: step === "question" ? "20px 28px 28px" : "40px 24px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: step === "question" ? 1120 : 760 }}>
          {deadlinePassed && !submission && step !== "result" && (
            <div style={{ background: "#fff", borderRadius: 22, border: "1.5px solid #fecaca", padding: "52px 44px", textAlign: "center", boxShadow: "0 12px 36px rgba(15,23,42,0.08)" }}>
              <div style={{ width: 72, height: 72, borderRadius: 22, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
                <Lock size={30} color="#dc2626" strokeWidth={2} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", margin: "0 0 10px" }}>Quiz ferme</h1>
              <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 28px", lineHeight: 1.6 }}>La date limite etait le <strong>{fmtDate(quiz.deadline!)}</strong>.</p>
              <button onClick={() => router.back()} style={{ padding: "12px 28px", background: "#f1f5f9", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#475569", cursor: "pointer" }}>Retour</button>
            </div>
          )}

          {!deadlinePassed && step === "intro" && !submission && (
            <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #e8ecf3", overflow: "hidden", textAlign: "center", boxShadow: "0 14px 40px rgba(15,23,42,0.08)" }}>
              <div style={{ background: "var(--accent)", padding: "42px 40px", color: "#fff" }}>
                <div style={{ width: 76, height: 76, borderRadius: 22, background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <BrainCircuit size={34} color="#fff" strokeWidth={2.5} />
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px", letterSpacing: 0 }}>{quiz.title}</h1>
                <p style={{ fontSize: 15, margin: 0, opacity: 0.88 }}>{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} ? plusieurs bonnes reponses possibles</p>
              </div>
              <div style={{ padding: "30px 40px 36px" }}>
                {quiz.deadline && <p style={{ fontSize: 13, color: "#d97706", margin: "0 0 22px", fontWeight: 700 }}>Date limite : {fmtDate(quiz.deadline)}</p>}
                <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 28px", lineHeight: 1.7 }}>Votre score sera enregistre a la fin. Une seule soumission possible.</p>
                <button onClick={() => setStep("question")} style={{ padding: "14px 34px", background: "var(--accent)", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 8px 22px color-mix(in oklch, var(--accent) 28%, transparent)" }}>Commencer</button>
              </div>
            </div>
          )}

          {step === "question" && activeQ && !submission && (
            <div style={{ minHeight: "calc(100vh - 120px)", display: "grid", gridTemplateRows: "auto minmax(260px, 1fr) auto", gap: 18 }}>
              <section style={{ background: "#fff", border: "1px solid #e8ecf3", borderRadius: 22, padding: "28px 32px", boxShadow: "0 10px 30px rgba(15,23,42,0.07)", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 99, background: "color-mix(in oklch, var(--accent) 8%, white)", color: "color-mix(in oklch, var(--accent) 85%, black)", fontSize: 12, fontWeight: 900, marginBottom: 16 }}>Question {qIndex + 1}</div>
                <h1 style={{ fontSize: 30, lineHeight: 1.25, color: "#0f172a", margin: 0, fontWeight: 900, letterSpacing: 0 }}>{activeQ.text}</h1>
                {activeQ.imageUrl && <div style={{ marginTop: 20 }}><img src={activeQ.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 16, border: "1px solid #e2e8f0", objectFit: "contain" }} /></div>}
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                {activeQ.answers.map((ans, ai) => {
                  const sel = (selected[activeQ.id] || new Set()).has(ans.id)
                  const styleSet = ANSWER_STYLES[ai % ANSWER_STYLES.length]
                  return (
                    <button key={ans.id} onClick={() => toggleAnswer(activeQ.id, ans.id)} style={{ minHeight: 116, display: "flex", alignItems: "center", gap: 16, padding: "20px 22px", borderRadius: 18, border: `3px solid ${sel ? styleSet.active : styleSet.border}`, background: sel ? styleSet.active : styleSet.bg, cursor: "pointer", textAlign: "left", transition: "transform 0.12s, box-shadow 0.12s, background 0.12s", boxShadow: sel ? "0 12px 24px rgba(15,23,42,0.14)" : "0 6px 18px rgba(15,23,42,0.06)", transform: sel ? "translateY(-2px)" : "none", fontFamily: "inherit" }}>
                      <span style={{ width: 42, height: 42, borderRadius: 12, background: sel ? "rgba(255,255,255,0.18)" : "#fff", color: sel ? "#fff" : styleSet.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, flexShrink: 0 }}>{styleSet.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: sel ? "#fff" : styleSet.text, lineHeight: 1.35 }}>{ans.text}</span>
                      {sel && <Check size={22} color="#fff" strokeWidth={3} style={{ marginLeft: "auto", flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </section>

              <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <button onClick={() => setQIndex(i => i - 1)} disabled={qIndex === 0} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 18px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 13, fontWeight: 800, color: "#475569", cursor: qIndex === 0 ? "not-allowed" : "pointer", opacity: qIndex === 0 ? 0.45 : 1 }}><ChevronLeft size={15} /> Precedent</button>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{(selected[activeQ.id] || new Set()).size} selectionnee{(selected[activeQ.id] || new Set()).size !== 1 ? "s" : ""}</div>
                {qIndex < quiz.questions.length - 1 ? <button onClick={() => setQIndex(i => i + 1)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 22px", background: "var(--accent)", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 900, color: "#fff", cursor: "pointer" }}>Suivant <ChevronRight size={15} /></button> : <button onClick={handleSubmit} disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 22px", background: "#10b981", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 900, color: "#fff", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>{submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />} {submitting ? "Enregistrement..." : "Terminer"}</button>}
              </footer>
            </div>
          )}

          {step === "result" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #e8ecf3", padding: "42px 36px", textAlign: "center", boxShadow: "0 12px 36px rgba(15,23,42,0.08)" }}>
                {submission && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, padding: "7px 16px", background: "#f0fdf4", borderRadius: 99, border: "1px solid #bbf7d0" }}><Check size={12} color="#10b981" strokeWidth={3} /><span style={{ fontSize: 12, color: "#15803d", fontWeight: 800 }}>Score enregistre</span></div>}
                <div style={{ fontSize: 68, fontWeight: 950, color: score.correct === score.total ? "#10b981" : score.correct >= score.total / 2 ? "#f59e0b" : "#ef4444", lineHeight: 1 }}>{score.correct}/{score.total}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#64748b", marginTop: 8 }}>{pct}%</div>
                <div style={{ fontSize: 15, color: "#64748b", marginTop: 10, fontWeight: 700 }}>{score.correct === score.total ? "Parfait" : score.correct >= score.total / 2 ? "Bien joue" : "A revoir"}</div>
                {submission && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Soumis le {fmtDate(submission.submittedAt)}</div>}
                <button onClick={() => router.back()} style={{ marginTop: 24, padding: "12px 24px", background: "var(--accent)", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 900, color: "#fff", cursor: "pointer" }}>Retour au groupe</button>
              </div>

              {quiz.questions.map((q, qi) => {
                const sel = selected[q.id] || new Set()
                const correctIds = new Set(q.answers.filter(a => a.isCorrect).map(a => a.id))
                const allRight = [...correctIds].every(id => sel.has(id)) && [...sel].every(id => correctIds.has(id))
                return (
                  <div key={q.id} style={{ background: "#fff", borderRadius: 18, border: `1.5px solid ${allRight ? "#86efac" : "#fca5a5"}`, padding: "20px 24px", boxShadow: "0 4px 14px rgba(15,23,42,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}><div style={{ width: 30, height: 30, borderRadius: 9, background: allRight ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{allRight ? <Check size={14} color="#fff" strokeWidth={3} /> : <X size={14} color="#fff" strokeWidth={3} />}</div><div><div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Question {qi + 1}</div><p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{q.text}</p></div></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                      {q.answers.map((ans) => {
                        const wasSel = sel.has(ans.id)
                        const bg = ans.isCorrect ? "#f0fdf4" : wasSel ? "#fef2f2" : "#f8fafc"
                        const border = ans.isCorrect ? "#86efac" : wasSel ? "#fca5a5" : "#e2e8f0"
                        return <div key={ans.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}><span style={{ width: 22, height: 22, borderRadius: 6, background: ans.isCorrect ? "#22c55e" : wasSel ? "#ef4444" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ans.isCorrect ? <Check size={11} color="#fff" strokeWidth={3} /> : wasSel ? <X size={11} color="#fff" strokeWidth={3} /> : null}</span><span style={{ fontSize: 13, fontWeight: ans.isCorrect ? 700 : 500, color: ans.isCorrect ? "#15803d" : wasSel ? "#dc2626" : "#374151" }}>{ans.text}</span></div>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )

}
