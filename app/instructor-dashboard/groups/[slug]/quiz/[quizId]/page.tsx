"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, ImageIcon, Check, X, Loader2, BrainCircuit, AlertCircle, Save, ExternalLink } from "lucide-react"
import LoadingBI from "@/components/LoadingBI"

type AnswerOption = { id: string; text: string; isCorrect: boolean; order: number }
type Question = { id: string; text: string; imageUrl: string | null; imageFile: File | null; imagePreview: string | null; answers: AnswerOption[]; order: number }
type Toast = { type: "ok" | "err"; msg: string }

function uid() { return Math.random().toString(36).slice(2, 10) }
function makeQuestion(order: number): Question {
  return { id: uid(), text: "", imageUrl: null, imageFile: null, imagePreview: null, order, answers: [{ id: uid(), text: "", isCorrect: false, order: 0 }, { id: uid(), text: "", isCorrect: false, order: 1 }] }
}

function useToast() {
  const [toasts, setToasts] = useState<(Toast & { id: number })[]>([])
  const push = (type: Toast["type"], msg: string) => {
    const id = Date.now()
    setToasts(p => [...p, { type, msg, id }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }
  return { toasts, push }
}

export default function EditQuizPage() {
  const { slug, quizId } = useParams<{ slug: string; quizId: string }>()
  const router = useRouter()
  const { toasts, push } = useToast()
  const imgRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [loading, setLoading] = useState(true)
  const [quizTitle, setQuizTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!quizId || !slug) return
    const load = async () => {
      try {
        const res = await fetch(`/api/instructor/groups/${slug}/quiz?quizId=${quizId}`)
        const d = await res.json()
        if (!d.ok) throw new Error(d.error)
        setQuizTitle(d.quiz.title)
        if (d.quiz.deadline) setDeadline(new Date(d.quiz.deadline).toISOString().slice(0, 16))
        setQuestions((d.quiz.questions || []).map((q: any) => ({
          id: q.id, text: q.text, imageUrl: q.imageUrl || null, imageFile: null, imagePreview: null, order: q.order,
          answers: (q.answers || []).map((a: any) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, order: a.order })),
        })))
      } catch (e: any) {
        push("err", e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quizId, slug])

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions(p => p.map(q => q.id === id ? { ...q, ...patch } : q))
  }
  function addQuestion() {
    const nq = makeQuestion(questions.length)
    setQuestions(p => [...p, nq])
    setTimeout(() => document.getElementById(`q-${nq.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }
  function removeQuestion(id: string) {
    if (questions.length === 1) return
    setQuestions(p => p.filter(q => q.id !== id))
  }
  function addAnswer(qid: string) {
    setQuestions(p => p.map(q => q.id === qid ? { ...q, answers: [...q.answers, { id: uid(), text: "", isCorrect: false, order: q.answers.length }] } : q))
  }
  function removeAnswer(qid: string, aid: string) {
    setQuestions(p => p.map(q => q.id === qid && q.answers.length > 2 ? { ...q, answers: q.answers.filter(a => a.id !== aid) } : q))
  }
  function toggleCorrect(qid: string, aid: string) {
    setQuestions(p => p.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, isCorrect: !a.isCorrect } : a) } : q))
  }
  function updateAnswer(qid: string, aid: string, text: string) {
    setQuestions(p => p.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, text } : a) } : q))
  }
  function handleImageSelect(qid: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    updateQuestion(qid, { imageFile: file, imagePreview: URL.createObjectURL(file), imageUrl: null })
    e.target.value = ""
  }

  async function handleSave() {
    if (!quizTitle.trim()) { push("err", "Titre requis"); return }
    const invalid = questions.findIndex(q => !q.text.trim() || q.answers.some(a => !a.text.trim()) || !q.answers.some(a => a.isCorrect))
    if (invalid !== -1) {
      push("err", `Question ${invalid + 1} : données incomplètes`)
      document.getElementById(`q-${questions[invalid].id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append("quizId", quizId)
      fd.append("title", quizTitle.trim())
      if (deadline) fd.append("deadline", new Date(deadline).toISOString())
      fd.append("questions", JSON.stringify(questions.map((q, qi) => ({
        id: q.id, text: q.text, order: qi, hasImage: !!q.imageFile, imageUrl: q.imageUrl,
        answers: q.answers.map((a, ai) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, order: ai })),
      }))))
      questions.forEach(q => { if (q.imageFile) fd.append(`img_${q.id}`, q.imageFile) })
      const res = await fetch(`/api/instructor/groups/${slug}/quiz`, { method: "PATCH", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      push("ok", "Quiz mis à jour")
    } catch (e: any) {
      push("err", e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingBI />

  return (
    <div style={{ minHeight: "100%", background: "#f0f4f9", fontFamily: "'Geist', 'Inter', sans-serif" }}>

      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid #e2e8f0", height: 60, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit size={15} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{quizTitle || "Quiz"}</span>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>· {questions.length} question{questions.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/instructor-dashboard/groups/${slug}/quiz/${quizId}/submissions`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#475569", textDecoration: "none", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLAnchorElement).style.color = "#475569" }}
          >
            <ExternalLink size={13} /> Soumissions
          </a>
          <button onClick={handleSave} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 100px" }}>

        {/* Title card */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", borderTop: "8px solid var(--accent)", marginBottom: 14, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <input
            value={quizTitle}
            onChange={e => setQuizTitle(e.target.value)}
            placeholder="Titre du quiz"
            style={{ width: "100%", border: "none", borderBottom: "2px solid #e2e8f0", outline: "none", fontSize: 24, fontWeight: 700, color: "#0f172a", fontFamily: "inherit", padding: "4px 0 10px", marginBottom: 20, boxSizing: "border-box", background: "transparent", transition: "border-color 0.15s" }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
          />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Date limite <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optionnel)</span></label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }}
              onFocus={e => (e.target.style.borderColor = "var(--accent)")}
              onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
        </div>

        {/* Question cards */}
        {questions.map((q, idx) => {
          const hasErr = !q.text.trim() || !q.answers.some(a => a.isCorrect)
          return (
            <div key={q.id} id={`q-${q.id}`} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${hasErr ? "#fca5a5" : "#e2e8f0"}`, borderLeft: `4px solid ${hasErr ? "#ef4444" : "var(--accent)"}`, marginBottom: 14, padding: "22px 24px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "border-color 0.2s" }}>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b", flex: 1 }}>Question {idx + 1}</span>
                {hasErr && <AlertCircle size={14} color="#ef4444" />}
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(q.id)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 6, cursor: "pointer", color: "#cbd5e1", transition: "color 0.12s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <textarea
                value={q.text}
                onChange={e => updateQuestion(q.id, { text: e.target.value })}
                placeholder="Rédigez votre question ici…"
                rows={2}
                style={{ width: "100%", border: "none", borderBottom: "1px solid #e2e8f0", outline: "none", fontSize: 15, fontWeight: 500, color: "#0f172a", fontFamily: "inherit", resize: "none", background: "transparent", padding: "0 0 10px", marginBottom: 18, boxSizing: "border-box", lineHeight: 1.6, transition: "border-color 0.15s" }}
                onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
              />

              <div style={{ marginBottom: 18 }}>
                {(q.imagePreview || q.imageUrl) ? (
                  <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                    <img src={q.imagePreview || q.imageUrl!} alt="" onClick={() => setLightbox(q.imagePreview || q.imageUrl!)} style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, border: "1px solid #e2e8f0", objectFit: "contain", display: "block", cursor: "zoom-in" }} />
                    <button onClick={() => updateQuestion(q.id, { imageFile: null, imagePreview: null, imageUrl: null })} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => imgRefs.current[q.id]?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "transparent", border: "1px dashed #d1d5db", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#94a3b8", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8" }}
                  >
                    <ImageIcon size={13} /> Ajouter une image
                  </button>
                )}
                <input ref={el => { imgRefs.current[q.id] = el }} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImageSelect(q.id, e)} />
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", marginBottom: 14 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Réponses</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Cocher les bonnes réponses</span>
                </div>
                {q.answers.map((ans, ai) => (
                  <div key={ans.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, border: `1px solid ${ans.isCorrect ? "#86efac" : "#f1f5f9"}`, background: ans.isCorrect ? "#f0fdf4" : "#fafbfc", transition: "all 0.15s" }}>
                    <button onClick={() => toggleCorrect(q.id, ans.id)} style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${ans.isCorrect ? "#22c55e" : "#d1d5db"}`, background: ans.isCorrect ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
                      {ans.isCorrect && <Check size={10} color="#fff" strokeWidth={3.5} />}
                    </button>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: ans.isCorrect ? "rgba(34,197,94,0.15)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: ans.isCorrect ? "#15803d" : "#94a3b8", flexShrink: 0 }}>
                      {String.fromCharCode(65 + ai)}
                    </div>
                    <input
                      value={ans.text}
                      onChange={e => updateAnswer(q.id, ans.id, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + ai)}`}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, fontWeight: ans.isCorrect ? 600 : 400, color: "#1e293b", fontFamily: "inherit" }}
                    />
                    {q.answers.length > 2 && (
                      <button onClick={() => removeAnswer(q.id, ans.id)} style={{ padding: "2px", background: "transparent", border: "none", cursor: "pointer", color: "#d1d5db", borderRadius: 4, transition: "color 0.12s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db"}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {q.answers.length < 6 && (
                  <button onClick={() => addAnswer(q.id)} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "transparent", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--accent)", cursor: "pointer", opacity: 0.8 }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"}
                  >
                    <Plus size={13} /> Ajouter une option
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <button onClick={addQuestion} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", background: "#fff", border: "2px dashed color-mix(in oklch, var(--accent) 35%, #e2e8f0)", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "var(--accent)", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 5%, white)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in oklch, var(--accent) 35%, #e2e8f0)"; (e.currentTarget as HTMLButtonElement).style.background = "#fff" }}
          >
            <Plus size={16} /> Ajouter une question
          </button>
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
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 20, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <X size={18} />
          </button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "88vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", cursor: "default" }} />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
