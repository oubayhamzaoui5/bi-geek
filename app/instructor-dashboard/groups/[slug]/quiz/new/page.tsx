"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Plus, Trash2, ImageIcon, Check, X, Loader2, GripVertical, BrainCircuit, AlertCircle } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type AnswerOption = {
  id: string
  text: string
  isCorrect: boolean
}

type Question = {
  id: string
  text: string
  imageFile: File | null
  imagePreview: string | null
  answers: AnswerOption[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function makeQuestion(): Question {
  return {
    id: uid(),
    text: "",
    imageFile: null,
    imagePreview: null,
    answers: [
      { id: uid(), text: "", isCorrect: false },
      { id: uid(), text: "", isCorrect: false },
    ],
  }
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

export default function NewQuizPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const moduleId = searchParams.get("moduleId") || ""
  const router = useRouter()
  const { toasts, push } = useToast()

  const [quizTitle, setQuizTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const [questions, setQuestions] = useState<Question[]>([makeQuestion()])
  const [activeQId, setActiveQId] = useState(questions[0].id)
  const [saving, setSaving] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [pendingImgQId, setPendingImgQId] = useState<string | null>(null)

  const activeQ = questions.find(q => q.id === activeQId) ?? questions[0]

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions(p => p.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  function addQuestion() {
    const nq = makeQuestion()
    setQuestions(p => [...p, nq])
    setActiveQId(nq.id)
  }

  function removeQuestion(id: string) {
    if (questions.length === 1) return
    const idx = questions.findIndex(q => q.id === id)
    const next = questions.filter(q => q.id !== id)
    setQuestions(next)
    setActiveQId(next[Math.max(0, idx - 1)].id)
  }

  function addAnswer(qid: string) {
    setQuestions(p => p.map(q =>
      q.id === qid ? { ...q, answers: [...q.answers, { id: uid(), text: "", isCorrect: false }] } : q
    ))
  }

  function removeAnswer(qid: string, aid: string) {
    setQuestions(p => p.map(q =>
      q.id === qid && q.answers.length > 2
        ? { ...q, answers: q.answers.filter(a => a.id !== aid) }
        : q
    ))
  }

  function toggleCorrect(qid: string, aid: string) {
    setQuestions(p => p.map(q =>
      q.id === qid
        ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, isCorrect: !a.isCorrect } : a) }
        : q
    ))
  }

  function updateAnswer(qid: string, aid: string, text: string) {
    setQuestions(p => p.map(q =>
      q.id === qid
        ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, text } : a) }
        : q
    ))
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const qid = pendingImgQId
    if (!qid || !e.target.files?.[0]) return
    const file = e.target.files[0]
    const preview = URL.createObjectURL(file)
    updateQuestion(qid, { imageFile: file, imagePreview: preview })
    e.target.value = ""
    setPendingImgQId(null)
  }

  async function handleSave() {
    if (!quizTitle.trim()) { push("err", "Titre du quiz requis"); return }
    const invalid = questions.findIndex(q => !q.text.trim() || q.answers.some(a => !a.text.trim()) || !q.answers.some(a => a.isCorrect))
    if (invalid !== -1) {
      setActiveQId(questions[invalid].id)
      push("err", `Question ${invalid + 1} : texte manquant, réponse vide, ou aucune bonne réponse`)
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append("moduleId", moduleId)
      fd.append("title", quizTitle.trim())
      if (deadline) fd.append("deadline", new Date(deadline).toISOString())
      fd.append("questions", JSON.stringify(questions.map((q, qi) => ({
        id: q.id,
        text: q.text,
        order: qi,
        hasImage: !!q.imageFile,
        answers: q.answers.map((a, ai) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, order: ai })),
      }))))
      questions.forEach((q) => {
        if (q.imageFile) fd.append(`img_${q.id}`, q.imageFile)
      })
      const res = await fetch(`/api/instructor/groups/${slug}/quiz`, { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur serveur")
      push("ok", "Quiz créé !")
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
                  <BrainCircuit size={16} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Créer un quiz</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{questions.length} question{questions.length !== 1 ? "s" : ""}</div>
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
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                {saving ? "Enregistrement…" : "Enregistrer le quiz"}
              </button>
            </div>
          </div>

          {/* Body: 2-col layout */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Left: question list + quiz title */}
            <div style={{
              width: 300,
              flexShrink: 0,
              borderRight: "1px solid #e8ecf3",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}>
              {/* Quiz title */}
              <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #f1f5f9" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                  Titre du quiz
                </label>
                <input
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  placeholder="Ex: Quiz sur les bases du SQL…"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f172a",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Deadline */}
              <div style={{ padding: "12px 18px 14px", borderBottom: "1px solid #f1f5f9" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                  Date limite <span style={{ fontWeight: 400, color: "#94a3b8", textTransform: "none" }}>(optionnel)</span>
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 12, color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Question list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
                {questions.map((q, idx) => {
                  const isActive = q.id === activeQId
                  const hasErr = !q.text.trim() || !q.answers.some(a => a.isCorrect)
                  return (
                    <div
                      key={q.id}
                      onClick={() => setActiveQId(q.id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        marginBottom: 4,
                        cursor: "pointer",
                        background: isActive ? "color-mix(in oklch, var(--accent) 8%, transparent)" : "transparent",
                        border: isActive ? "1.5px solid color-mix(in oklch, var(--accent) 22%, transparent)" : "1.5px solid transparent",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                    >
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        background: isActive ? "var(--accent)" : "#f1f5f9",
                        color: isActive ? "#fff" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.text || <span style={{ color: "#94a3b8", fontWeight: 500 }}>Question {idx + 1}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          {q.answers.length} réponse{q.answers.length !== 1 ? "s" : ""} · {q.answers.filter(a => a.isCorrect).length} correcte{q.answers.filter(a => a.isCorrect).length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {hasErr && <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />}
                      {questions.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); removeQuestion(q.id) }}
                          style={{ padding: "2px", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", color: "#cbd5e1", transition: "color 0.12s", flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add question */}
              <div style={{ padding: "10px 10px 14px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  onClick={addQuestion}
                  style={{
                    width: "100%",
                    padding: "9px 0",
                    background: "transparent",
                    border: "1.5px dashed color-mix(in oklch, var(--accent) 28%, white)",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--accent)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 5%, transparent)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = "color-mix(in oklch, var(--accent) 28%, white)" }}
                >
                  <Plus size={14} /> Ajouter une question
                </button>
              </div>
            </div>

            {/* Right: question editor */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
              {activeQ && (
                <div style={{ maxWidth: 720, margin: "0 auto" }}>

                  {/* Question header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {questions.findIndex(q => q.id === activeQId) + 1}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                      Question {questions.findIndex(q => q.id === activeQId) + 1}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginLeft: "auto" }}>
                      {activeQ.answers.filter(a => a.isCorrect).length} réponse{activeQ.answers.filter(a => a.isCorrect).length !== 1 ? "s" : ""} correcte{activeQ.answers.filter(a => a.isCorrect).length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Question text */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Énoncé
                    </label>
                    <textarea
                      value={activeQ.text}
                      onChange={e => updateQuestion(activeQId, { text: e.target.value })}
                      placeholder="Rédigez votre question ici…"
                      rows={3}
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
                        lineHeight: 1.6,
                        boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>

                  {/* Image upload */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Image <span style={{ fontWeight: 400, color: "#94a3b8", textTransform: "none" }}>(optionnel)</span>
                    </label>
                    {activeQ.imagePreview ? (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img
                          src={activeQ.imagePreview}
                          alt="aperçu"
                          style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 12, border: "1.5px solid #e2e8f0", display: "block", objectFit: "contain" }}
                        />
                        <button
                          onClick={() => updateQuestion(activeQId, { imageFile: null, imagePreview: null })}
                          style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setPendingImgQId(activeQId); imgInputRef.current?.click() }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 18px",
                          background: "#f8fafc",
                          border: "1.5px dashed #cbd5e1",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#64748b",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--accent) 4%, transparent)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
                      >
                        <ImageIcon size={15} /> Ajouter une image
                      </button>
                    )}
                    <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
                  </div>

                  {/* Answers */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Réponses
                      </label>
                      <span style={{ fontSize: 11, color: "#64748b" }}>Cocher les bonnes réponses</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {activeQ.answers.map((ans, ai) => (
                        <div
                          key={ans.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 14px",
                            borderRadius: 12,
                            border: ans.isCorrect ? "1.5px solid #86efac" : "1.5px solid #e2e8f0",
                            background: ans.isCorrect ? "#f0fdf4" : "#fff",
                            transition: "all 0.15s",
                          }}
                        >
                          {/* Correct toggle */}
                          <button
                            onClick={() => toggleCorrect(activeQId, ans.id)}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              border: ans.isCorrect ? "2px solid #22c55e" : "2px solid #d1d5db",
                              background: ans.isCorrect ? "#22c55e" : "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              flexShrink: 0,
                              transition: "all 0.15s",
                            }}
                          >
                            {ans.isCorrect && <Check size={12} color="#fff" strokeWidth={3} />}
                          </button>

                          {/* Answer letter badge */}
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: ans.isCorrect ? "rgba(34,197,94,0.15)" : "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            color: ans.isCorrect ? "#15803d" : "#64748b",
                            flexShrink: 0,
                          }}>
                            {String.fromCharCode(65 + ai)}
                          </div>

                          <input
                            value={ans.text}
                            onChange={e => updateAnswer(activeQId, ans.id, e.target.value)}
                            placeholder={`Réponse ${String.fromCharCode(65 + ai)}…`}
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              fontSize: 14,
                              fontWeight: ans.isCorrect ? 600 : 400,
                              color: "#0f172a",
                              fontFamily: "inherit",
                            }}
                          />

                          {activeQ.answers.length > 2 && (
                            <button
                              onClick={() => removeAnswer(activeQId, ans.id)}
                              style={{ padding: "2px 4px", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", color: "#cbd5e1", transition: "color 0.12s" }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addAnswer(activeQId)}
                      disabled={activeQ.answers.length >= 6}
                      style={{
                        marginTop: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        background: "transparent",
                        border: "1.5px dashed #d1d5db",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#94a3b8",
                        cursor: activeQ.answers.length >= 6 ? "not-allowed" : "pointer",
                        opacity: activeQ.answers.length >= 6 ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (activeQ.answers.length < 6) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)" } }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8" }}
                    >
                      <Plus size={13} /> Ajouter une réponse
                    </button>
                  </div>
                </div>
              )}
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
