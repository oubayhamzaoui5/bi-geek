"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BrainCircuit, Check, X, AlertCircle, Clock, Lock, Loader2 } from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

type Answer   = { id: string; text: string; isCorrect: boolean; order: number }
type Question = { id: string; text: string; imageUrl: string | null; order: number; answers: Answer[] }
type Quiz     = { id: string; title: string; deadline: string | null; questions: Question[] }
type Submission = { id: string; score: number; total: number; submittedAt: string; answersJson?: Record<string, string[]> }

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

export default function StudentQuizPage() {
  const { slug, quizId } = useParams<{ slug: string; quizId: string }>()
  const router = useRouter()

  const [quiz, setQuiz]             = useState<Quiz | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep]             = useState<"intro" | "quiz" | "result">("intro")
  const [selected, setSelected]     = useState<Record<string, Set<string>>>({})
  const [lightbox, setLightbox]     = useState<string | null>(null)

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
      if ([...correctIds].every(id => sel.has(id)) && [...sel].every(id => correctIds.has(id))) correct++
    }
    return { correct, total: quiz.questions.length }
  }

  async function handleSubmit() {
    if (!quiz || !studentId) { setStep("result"); return }
    const score = calcScore()
    setSubmitting(true)
    try {
      const answersJson: Record<string, string[]> = {}
      for (const [qId, sel] of Object.entries(selected)) answersJson[qId] = [...sel]
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
      <div style={{ minHeight: "100vh", background: "#f0f4f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>
        <div style={{ textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "40px 44px", boxShadow: "0 4px 20px rgba(15,23,42,0.08)" }}>
          <AlertCircle size={36} style={{ color: "#e2e8f0", margin: "0 auto 12px" }} />
          <p style={{ color: "#64748b", margin: "0 0 20px" }}>{error || "Quiz introuvable"}</p>
          <button onClick={() => router.back()} style={{ padding: "10px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Retour</button>
        </div>
      </div>
    )
  }

  const deadlinePassed = quiz.deadline ? new Date(quiz.deadline) < new Date() : false
  const score = submission ? { correct: submission.score, total: submission.total } : calcScore()
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0
  const answeredCount = quiz.questions.filter(q => (selected[q.id]?.size || 0) > 0).length

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f9", fontFamily: "var(--ff-body,'DM Sans',sans-serif)" }}>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid #e2e8f0", height: 60, padding: "0 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BrainCircuit size={15} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quiz.title}</div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""}</div>
        </div>
        {quiz.deadline && step !== "result" && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 99, background: deadlinePassed ? "#fef2f2" : "#fffbeb", border: `1px solid ${deadlinePassed ? "#fecaca" : "#fde68a"}`, flexShrink: 0 }}>
            <Clock size={11} color={deadlinePassed ? "#dc2626" : "#d97706"} />
            <span style={{ fontSize: 11, fontWeight: 700, color: deadlinePassed ? "#dc2626" : "#d97706" }}>{deadlinePassed ? "Délai dépassé" : fmtDate(quiz.deadline)}</span>
          </div>
        )}
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 80px" }}>

        {/* Deadline passed */}
        {deadlinePassed && !submission && step !== "result" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #fecaca", borderTop: "6px solid #ef4444", padding: "40px 32px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <Lock size={24} color="#dc2626" strokeWidth={2} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>Quiz fermé</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>La date limite était le <strong>{fmtDate(quiz.deadline!)}</strong>.</p>
            <button onClick={() => router.back()} style={{ padding: "10px 24px", background: "#f1f5f9", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>Retour</button>
          </div>
        )}

        {/* Intro */}
        {!deadlinePassed && step === "intro" && !submission && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", borderTop: "8px solid var(--accent)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "32px 32px 0" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "color-mix(in oklch, var(--accent) 12%, white)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <BrainCircuit size={22} color="var(--accent)" strokeWidth={2.5} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>{quiz.title}</h1>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 6px", lineHeight: 1.6 }}>{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} · plusieurs bonnes réponses possibles</p>
              {quiz.deadline && <p style={{ fontSize: 13, color: "#d97706", fontWeight: 700, margin: "0 0 0" }}>Date limite : {fmtDate(quiz.deadline)}</p>}
            </div>
            <div style={{ padding: "20px 32px 32px" }}>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.6 }}>Votre score sera enregistré à la fin. Une seule soumission possible.</p>
              <button onClick={() => setStep("quiz")} style={{ padding: "12px 32px", background: "var(--accent)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px color-mix(in oklch, var(--accent) 30%, transparent)" }}>
                Commencer le quiz
              </button>
            </div>
          </div>
        )}

        {/* Quiz — all questions as cards */}
        {step === "quiz" && !submission && (
          <>
            {/* Progress indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{answeredCount} / {quiz.questions.length} répondues</span>
              <div style={{ width: 160, height: 6, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "var(--accent)", width: `${(answeredCount / quiz.questions.length) * 100}%`, transition: "width 0.25s" }} />
              </div>
            </div>

            {quiz.questions.map((q, qi) => {
              const sel = selected[q.id] || new Set()
              return (
                <div key={q.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", borderLeft: `4px solid ${sel.size > 0 ? "var(--accent)" : "#e2e8f0"}`, marginBottom: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "border-color 0.2s" }}>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: sel.size > 0 ? "var(--accent)" : "#f1f5f9", color: sel.size > 0 ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, transition: "all 0.2s" }}>
                      {qi + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: 1.5 }}>{q.text}</p>
                      {q.imageUrl && <img src={q.imageUrl} alt="" onClick={() => setLightbox(q.imageUrl)} style={{ marginTop: 12, maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid #e2e8f0", objectFit: "contain", display: "block", margin: "12px auto 0", cursor: "zoom-in" }} />}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {q.answers.map((ans, ai) => {
                      const isSelected = sel.has(ans.id)
                      return (
                        <button key={ans.id} onClick={() => toggleAnswer(q.id, ans.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${isSelected ? "var(--accent)" : "#e8ecf3"}`, background: isSelected ? "color-mix(in oklch, var(--accent) 7%, white)" : "#fafbfc", cursor: "pointer", textAlign: "left", transition: "all 0.15s", fontFamily: "inherit" }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${isSelected ? "var(--accent)" : "#d1d5db"}`, background: isSelected ? "var(--accent)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                            {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: isSelected ? "color-mix(in oklch, var(--accent) 15%, white)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: isSelected ? "var(--accent)" : "#94a3b8", flexShrink: 0 }}>
                            {String.fromCharCode(65 + ai)}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400, color: isSelected ? "#0f172a" : "#374151", flex: 1 }}>{ans.text}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Submit */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button onClick={handleSubmit} disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 40px", background: "#10b981", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, color: "#fff", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow: "0 4px 16px rgba(16,185,129,0.35)", transition: "opacity 0.15s" }}>
                {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={16} strokeWidth={3} />}
                {submitting ? "Enregistrement…" : "Soumettre le quiz"}
              </button>
            </div>
          </>
        )}

        {/* Result */}
        {step === "result" && (
          <>
            {/* Score card */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", borderTop: `8px solid ${score.correct === score.total ? "#10b981" : score.correct >= score.total / 2 ? "#f59e0b" : "#ef4444"}`, marginBottom: 14, padding: "32px 28px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              {submission && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, padding: "6px 14px", background: "#f0fdf4", borderRadius: 99, border: "1px solid #bbf7d0" }}>
                  <Check size={11} color="#10b981" strokeWidth={3} />
                  <span style={{ fontSize: 12, color: "#15803d", fontWeight: 700 }}>Score enregistré</span>
                </div>
              )}
              <div style={{ fontSize: 64, fontWeight: 900, color: score.correct === score.total ? "#10b981" : score.correct >= score.total / 2 ? "#f59e0b" : "#ef4444", lineHeight: 1, marginBottom: 4 }}>
                {score.correct}/{score.total}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#64748b", marginBottom: 8 }}>{pct}%</div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
                {score.correct === score.total ? "Parfait !" : score.correct >= score.total / 2 ? "Bien joué" : "À revoir"}
              </div>
              {submission && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Soumis le {fmtDate(submission.submittedAt)}</div>}
              <button onClick={() => router.back()} style={{ padding: "10px 24px", background: "var(--accent)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Retour au groupe</button>
            </div>

            {/* Per-question review */}
            {quiz.questions.map((q, qi) => {
              const sel = selected[q.id] || new Set()
              const correctIds = new Set(q.answers.filter(a => a.isCorrect).map(a => a.id))
              const allRight = [...correctIds].every(id => sel.has(id)) && [...sel].every(id => correctIds.has(id))
              return (
                <div key={q.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", borderLeft: `4px solid ${allRight ? "#22c55e" : "#ef4444"}`, marginBottom: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: allRight ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {allRight ? <Check size={13} color="#fff" strokeWidth={3} /> : <X size={13} color="#fff" strokeWidth={3} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Question {qi + 1}</div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: 1.5 }}>{q.text}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {q.answers.map(ans => {
                      const wasSel = sel.has(ans.id)
                      const bg = ans.isCorrect ? "#f0fdf4" : wasSel ? "#fef2f2" : "#f8fafc"
                      const border = ans.isCorrect ? "#86efac" : wasSel ? "#fca5a5" : "#f1f5f9"
                      return (
                        <div key={ans.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: bg, border: `1px solid ${border}` }}>
                          <span style={{ width: 20, height: 20, borderRadius: 6, background: ans.isCorrect ? "#22c55e" : wasSel ? "#ef4444" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {ans.isCorrect ? <Check size={10} color="#fff" strokeWidth={3.5} /> : wasSel ? <X size={10} color="#fff" strokeWidth={3.5} /> : null}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: ans.isCorrect ? 700 : 400, color: ans.isCorrect ? "#15803d" : wasSel ? "#dc2626" : "#374151" }}>{ans.text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 20, right: 20, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "88vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", cursor: "default" }}
          />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
