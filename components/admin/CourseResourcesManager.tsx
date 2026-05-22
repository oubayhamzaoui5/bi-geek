"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle, ArrowLeft, BookOpen, Check, ChevronDown, ExternalLink,
  FileText, GripVertical, Layers, Loader2, Pencil, Plus, Save, Trash2,
  Upload, Video, X,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import LoadingBI from "@/components/LoadingBI"

type Module = { id: string; title: string; order: number; description: string; durationLabel?: string }
type Lesson = { id: string; moduleId: string; title: string; order: number; description: string; content: string; durationLabel?: string }
type VideoItem = { id: string; lessonId?: string; moduleId?: string; title: string; driveUrl: string; description: string; order?: number }
type Attachment = { id: string; lessonId?: string; moduleId?: string; name: string; url: string | null; order?: number }
type Course = { id: string; title: string; shortDescription: string }
type Toast = { id: string; type: "ok" | "err"; text: string }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = (type: "ok" | "err", text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, type, text }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }
  return { toasts, push }
}

function getVideoIndex(id: string) {
  const parts = id.split(":")
  return Number(parts[parts.length - 1] ?? -1)
}

function getDriveThumbnailUrl(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : null
}

export default function CourseResourcesManager({ courseId }: { courseId: string }) {
  const router = useRouter()
  const { toasts, push } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [moduleVideos, setModuleVideos] = useState<VideoItem[]>([])
  const [moduleAttachments, setModuleAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null)
  const [addingVideoFor, setAddingVideoFor] = useState<{ scope: "module" | "lesson"; id: string } | null>(null)
  const [uploadFor, setUploadFor] = useState<{ scope: "module" | "lesson"; id: string } | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [newVideo, setNewVideo] = useState({ title: "", driveUrl: "", description: "" })

  const sortedModules = [...modules].sort((a, b) => a.order - b.order)
  const selectedLesson = lessons.find(l => l.id === selectedLessonId) || null

  async function load() {
    setLoading(true)
    try {
      await fetch("/api/admin/migrate", { cache: "no-store" }).catch(() => null)
      const res = await fetch(`/api/admin/courses/${courseId}/resources`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur")
      setCourse(data.course)
      setModules(data.modules || [])
      setLessons(data.lessons || [])
      setVideos(data.videos || [])
      setAttachments(data.lessonAttachments || [])
      setModuleVideos(data.moduleVideos || [])
      setModuleAttachments(data.moduleAttachments || [])
      if (data.modules?.[0]?.id) setExpandedModules(new Set([data.modules[0].id]))
    } catch (err: any) {
      push("err", err.message || "Impossible de charger les ressources")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [courseId])

  async function callResources(method: string, body: object) {
    const res = await fetch(`/api/admin/courses/${courseId}/resources`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Erreur")
    return data
  }

  async function createModule() {
    if (!newModuleTitle.trim()) return
    try {
      const data = await callResources("POST", { type: "module", title: newModuleTitle.trim() })
      setModules(p => [...p, data.module])
      setExpandedModules(p => new Set([...p, data.module.id]))
      setAddingModule(false)
      setNewModuleTitle("")
      push("ok", "Module cree")
    } catch (err: any) { push("err", err.message) }
  }

  async function updateModule(module: Module) {
    setSavingId(module.id)
    try {
      const data = await callResources("PATCH", { type: "module", id: module.id, title: module.title, durationLabel: module.durationLabel || "" })
      setModules(p => p.map(m => m.id === module.id ? { ...m, ...data.module } : m))
      push("ok", "Module enregistre")
    } catch (err: any) { push("err", err.message) }
    finally { setSavingId(null) }
  }

  async function createLesson(moduleId: string) {
    if (!newLessonTitle.trim()) return
    try {
      const order = lessons.filter(l => l.moduleId === moduleId).length + moduleVideos.filter(v => v.moduleId === moduleId).length + moduleAttachments.filter(a => a.moduleId === moduleId).length
      const data = await callResources("POST", { type: "lesson", moduleId, title: newLessonTitle.trim(), order })
      setLessons(p => [...p, data.lesson])
      setSelectedLessonId(data.lesson.id)
      setAddingLessonFor(null)
      setNewLessonTitle("")
      push("ok", "Lecon creee")
    } catch (err: any) { push("err", err.message) }
  }

  async function updateLesson(lesson: Lesson) {
    setSavingId(lesson.id)
    try {
      const data = await callResources("PATCH", { type: "lesson", id: lesson.id, title: lesson.title, durationLabel: lesson.durationLabel || "", description: lesson.description || "", content: lesson.content || "" })
      setLessons(p => p.map(l => l.id === lesson.id ? { ...l, ...data.lesson } : l))
      push("ok", "Lecon enregistree")
    } catch (err: any) { push("err", err.message) }
    finally { setSavingId(null) }
  }

  async function createVideo() {
    if (!addingVideoFor || !newVideo.title.trim() || !newVideo.driveUrl.trim()) return
    try {
      if (addingVideoFor.scope === "module") {
        const data = await callResources("POST", { type: "module_video", moduleId: addingVideoFor.id, ...newVideo })
        setModuleVideos(p => [...p, data.moduleVideo])
      } else {
        const data = await callResources("POST", { type: "video", lessonId: addingVideoFor.id, ...newVideo })
        setVideos(p => [...p, data.video])
      }
      setAddingVideoFor(null)
      setNewVideo({ title: "", driveUrl: "", description: "" })
      push("ok", "Video ajoutee")
    } catch (err: any) { push("err", err.message) }
  }

  async function updateVideo(video: VideoItem, scope: "module" | "lesson") {
    try {
      if (scope === "module") {
        const data = await callResources("PATCH", { type: "module_video", moduleId: video.moduleId, index: getVideoIndex(video.id), title: video.title, driveUrl: video.driveUrl, description: video.description })
        setModuleVideos(p => p.map(v => v.id === video.id ? data.moduleVideo : v))
      } else {
        const data = await callResources("PATCH", { type: "video", lessonId: video.lessonId, index: getVideoIndex(video.id), title: video.title, driveUrl: video.driveUrl, description: video.description })
        setVideos(p => p.map(v => v.id === video.id ? data.video : v))
      }
      push("ok", "Video enregistree")
    } catch (err: any) { push("err", err.message) }
  }

  async function uploadFile(file: File) {
    if (!uploadFor) return
    const fd = new FormData()
    fd.append(uploadFor.scope === "module" ? "moduleId" : "lessonId", uploadFor.id)
    fd.append("name", file.name)
    fd.append("file", file)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/resources/attachments`, { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur upload")
      if (uploadFor.scope === "module") setModuleAttachments(p => [...p, data.attachment])
      else setAttachments(p => [...p, data.attachment])
      push("ok", "Fichier ajoute")
    } catch (err: any) { push("err", err.message) }
    finally { setUploadFor(null) }
  }

  async function deleteItem(type: "module" | "lesson" | "module_video" | "module_attachment" | "video" | "lesson_attachment", item: any) {
    if (!confirm("Supprimer cet element ?")) return
    try {
      const body =
        type === "module_video" ? { type, moduleId: item.moduleId, index: getVideoIndex(item.id) } :
        type === "module_attachment" ? { type, moduleId: item.moduleId, filename: item.name } :
        type === "video" ? { type, lessonId: item.lessonId, index: getVideoIndex(item.id) } :
        type === "lesson_attachment" ? { type, lessonId: item.lessonId, filename: item.name } :
        { type, id: item.id }
      await callResources("DELETE", body)
      if (type === "module") {
        setModules(p => p.filter(m => m.id !== item.id))
        setLessons(p => p.filter(l => l.moduleId !== item.id))
        setModuleVideos(p => p.filter(v => v.moduleId !== item.id))
        setModuleAttachments(p => p.filter(a => a.moduleId !== item.id))
      } else if (type === "lesson") {
        setLessons(p => p.filter(l => l.id !== item.id))
        setVideos(p => p.filter(v => v.lessonId !== item.id))
        setAttachments(p => p.filter(a => a.lessonId !== item.id))
      } else if (type === "module_video") setModuleVideos(p => p.filter(v => v.id !== item.id))
      else if (type === "module_attachment") setModuleAttachments(p => p.filter(a => a.id !== item.id))
      else if (type === "video") setVideos(p => p.filter(v => v.id !== item.id))
      else setAttachments(p => p.filter(a => a.id !== item.id))
      push("ok", "Element supprime")
    } catch (err: any) { push("err", err.message) }
  }

  if (loading) return <LoadingBI />

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <AdminPageHeader
        title="Ressources du cours"
        description={course ? `${course.title} · programme par defaut` : "Programme par defaut"}
        breadcrumbs={[{ label: "Formations", href: "/admin-dashboard/courses" }, { label: "Ressources" }]}
        actions={<button onClick={() => router.push("/admin-dashboard/courses")} style={ghostBtnStyle}><ArrowLeft size={14} /> Retour</button>}
      />

      <div style={{ padding: "28px 32px 76px", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ position: "relative", paddingLeft: 16 }}>
          <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: "linear-gradient(to bottom, var(--accent), color-mix(in oklch, var(--accent) 60%, white))", borderRadius: 99 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Programme</span>
              <span style={metaTextStyle}>{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
              <span style={{ color: "#d1d5db", fontSize: 13 }}>·</span>
              <span style={metaTextStyle}>{lessons.length} lecon{lessons.length !== 1 ? "s" : ""}</span>
            </div>
            <button onClick={() => setAddingModule(true)} style={primaryBtnStyle}><Plus size={13} /> Module</button>
          </div>

          {addingModule && (
            <div style={inlineTopFormStyle}>
              <input autoFocus value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createModule(); if (e.key === "Escape") setAddingModule(false) }} placeholder="Titre du module..." style={inlineInputStyle} />
              <button onClick={createModule} style={smallPrimaryBtn}>Creer</button>
              <button onClick={() => setAddingModule(false)} style={smallGhostBtn}><X size={13} /></button>
            </div>
          )}

          {modules.length === 0 && !addingModule && (
            <div style={emptyCardStyle}>
              <BookOpen size={28} style={{ color: "#e2e8f0", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Aucun module. Cliquez sur “Module” pour commencer.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedModules.map((mod, modIdx) => {
              const modLessons = lessons.filter(l => l.moduleId === mod.id).sort((a, b) => a.order - b.order)
              const modVideos = moduleVideos.filter(v => v.moduleId === mod.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              const modAtts = moduleAttachments.filter(a => a.moduleId === mod.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              const isExpanded = expandedModules.has(mod.id)
              const etapeNum = String(modIdx + 1).padStart(2, "0")
              const items = [
                ...modVideos.map(v => ({ kind: "module_video" as const, order: v.order ?? 0, item: v })),
                ...modAtts.map(a => ({ kind: "module_attachment" as const, order: a.order ?? 999, item: a })),
                ...modLessons.map(l => ({ kind: "lesson" as const, order: l.order ?? 0, item: l })),
              ].sort((a, b) => a.order - b.order)

              return (
                <div key={mod.id} style={moduleCardStyle}>
                  <div onClick={() => setExpandedModules(prev => { const next = new Set(prev); next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id); return next })} style={moduleHeaderStyle}>
                    <div style={stepBadgeStyle}>{etapeNum}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={eyebrowStyle}>ETAPE {etapeNum}</div>
                      <input
                        value={mod.title}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setModules(p => p.map(m => m.id === mod.id ? { ...m, title: e.target.value } : m))}
                        style={moduleTitleInputStyle}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <BookOpen size={12} color="#9ca3af" />
                        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{modLessons.length} lecon{modLessons.length !== 1 ? "s" : ""}</span>
                        <span style={{ color: "#e2e8f0", fontSize: 12 }}>·</span>
                        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{modVideos.length + modAtts.length} ressource{modVideos.length + modAtts.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input value={mod.durationLabel || ""} onChange={e => setModules(p => p.map(m => m.id === mod.id ? { ...m, durationLabel: e.target.value } : m))} placeholder="Duree" style={durationInputStyle} />
                      <button onClick={() => updateModule(mod)} style={iconSoftStyle}>{savingId === mod.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}</button>
                      <button onClick={() => deleteItem("module", mod)} style={iconDangerStyle}><Trash2 size={13} /></button>
                      <GripVertical size={15} color="#d1d5db" />
                      <ChevronDown size={17} style={{ color: "#9ca3af", transition: "transform 0.2s", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #f0f1f5" }}>
                      {items.map(({ kind, item }, index) => {
                        if (kind === "lesson") return (
                          <LessonRow
                            key={`lesson:${item.id}`}
                            lesson={item}
                            index={index}
                            active={selectedLessonId === item.id}
                            onSelect={() => setSelectedLessonId(selectedLessonId === item.id ? null : item.id)}
                            onDelete={() => deleteItem("lesson", item)}
                          />
                        )
                        if (kind === "module_video") return (
                          <VideoRow
                            key={`module_video:${item.id}`}
                            video={item}
                            color="#f59e0b"
                            label="Video"
                            setVideos={setModuleVideos}
                            update={video => updateVideo(video, "module")}
                            onDelete={() => deleteItem("module_video", item)}
                          />
                        )
                        return (
                          <FileRow
                            key={`module_attachment:${item.id}`}
                            attachment={item}
                            label="PDF"
                            onDelete={() => deleteItem("module_attachment", item)}
                          />
                        )
                      })}

                      {items.length === 0 && <p style={emptyTextStyle}>Aucune ressource dans ce module.</p>}

                      {selectedLesson && selectedLesson.moduleId === mod.id && (
                        <div style={lessonEditorStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <input value={selectedLesson.title} onChange={e => setLessons(p => p.map(l => l.id === selectedLesson.id ? { ...l, title: e.target.value } : l))} style={lessonTitleInputStyle} />
                            <button onClick={() => updateLesson(selectedLesson)} style={smallPrimaryBtn}>{savingId === selectedLesson.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer</button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                            <textarea value={selectedLesson.description || ""} onChange={e => setLessons(p => p.map(l => l.id === selectedLesson.id ? { ...l, description: e.target.value } : l))} placeholder="Description" rows={3} style={textareaStyle} />
                            <textarea value={selectedLesson.content || ""} onChange={e => setLessons(p => p.map(l => l.id === selectedLesson.id ? { ...l, content: e.target.value } : l))} placeholder="Contenu" rows={3} style={textareaStyle} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div style={miniPanelStyle}>
                              <MiniHeader title="Videos de la lecon" icon={<Video size={14} color="#f59e0b" />} onAdd={() => setAddingVideoFor({ scope: "lesson", id: selectedLesson.id })} />
                              {videos.filter(v => v.lessonId === selectedLesson.id).map(video => (
                                <VideoRow key={video.id} video={video} color="#f59e0b" label="Video" compact setVideos={setVideos} update={v => updateVideo(v, "lesson")} onDelete={() => deleteItem("video", video)} />
                              ))}
                            </div>
                            <div style={miniPanelStyle}>
                              <MiniHeader title="PDFs de la lecon" icon={<FileText size={14} color="#e11d48" />} onAdd={() => { setUploadFor({ scope: "lesson", id: selectedLesson.id }); setTimeout(() => fileInputRef.current?.click(), 0) }} />
                              {attachments.filter(a => a.lessonId === selectedLesson.id).map(att => <FileRow key={att.id} attachment={att} label="PDF" compact onDelete={() => deleteItem("lesson_attachment", att)} />)}
                            </div>
                          </div>
                        </div>
                      )}

                      {addingLessonFor === mod.id && (
                        <div style={inlineListFormStyle}>
                          <input autoFocus value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createLesson(mod.id); if (e.key === "Escape") setAddingLessonFor(null) }} placeholder="Titre de la lecon..." style={inlineInputStyle} />
                          <button onClick={() => createLesson(mod.id)} style={smallPrimaryBtn}>Ajouter</button>
                          <button onClick={() => setAddingLessonFor(null)} style={smallGhostBtn}><X size={12} /></button>
                        </div>
                      )}

                      {addingVideoFor?.scope === "module" && addingVideoFor.id === mod.id && (
                        <VideoCreateForm onCreate={createVideo} onCancel={() => setAddingVideoFor(null)} newVideo={newVideo} setNewVideo={setNewVideo} />
                      )}
                      {addingVideoFor?.scope === "lesson" && selectedLesson?.moduleId === mod.id && (
                        <VideoCreateForm onCreate={createVideo} onCancel={() => setAddingVideoFor(null)} newVideo={newVideo} setNewVideo={setNewVideo} />
                      )}

                      <div style={addBarStyle}>
                        <button onClick={() => setAddingLessonFor(mod.id)} style={addPillStyle}><Plus size={12} /> Lecon</button>
                        <button onClick={() => setAddingVideoFor({ scope: "module", id: mod.id })} style={addPillStyle}><Video size={12} /> Video module</button>
                        <button onClick={() => { setUploadFor({ scope: "module", id: mod.id }); setTimeout(() => fileInputRef.current?.click(), 0) }} style={addPillStyle}><Upload size={12} /> PDF module</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) void uploadFile(file) }} />

      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 80, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, background: "#fff", border: t.type === "ok" ? "1px solid #bbf7d0" : "1px solid #fecaca", color: t.type === "ok" ? "#15803d" : "#dc2626", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", fontSize: 13, fontWeight: 700 }}>
            {t.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function LessonRow({ lesson, index, active, onSelect, onDelete }: { lesson: Lesson; index: number; active: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div onClick={onSelect} style={{ ...rowStyle, background: active ? "rgba(99,102,241,0.06)" : "transparent", cursor: "pointer" }}>
      <div style={{ ...rowIconStyle, background: "#6366f1" }}><BookOpen size={16} color="#fff" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...rowTypeStyle, color: "#6366f1" }}>Lecon {String(index + 1).padStart(2, "0")}</div>
        <span style={rowTitleStyle}>{lesson.title}</span>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete() }} style={iconDangerStyle}><Trash2 size={13} /></button>
      <ChevronDown size={15} style={{ color: "#d1d5db", transform: active ? "rotate(0deg)" : "rotate(-90deg)" }} />
    </div>
  )
}

function VideoRow({ video, color, label, compact, setVideos, update, onDelete }: { video: VideoItem; color: string; label: string; compact?: boolean; setVideos: React.Dispatch<React.SetStateAction<VideoItem[]>>; update: (video: VideoItem) => void; onDelete: () => void }) {
  const thumb = getDriveThumbnailUrl(video.driveUrl)
  return (
    <div style={{ ...rowStyle, padding: compact ? "8px 10px" : rowStyle.padding }}>
      <div style={{ ...rowIconStyle, background: color }}>{thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Video size={16} color="#fff" />}</div>
      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
        <div style={{ ...rowTypeStyle, color }}>{label}</div>
        <input value={video.title} onChange={e => setVideos(p => p.map(v => v.id === video.id ? { ...v, title: e.target.value } : v))} onBlur={() => update(video)} style={inlineFieldStyle} />
        <input value={video.driveUrl} onChange={e => setVideos(p => p.map(v => v.id === video.id ? { ...v, driveUrl: e.target.value } : v))} onBlur={() => update(video)} style={{ ...inlineFieldStyle, fontSize: 11, color: "#64748b" }} />
      </div>
      {video.driveUrl && <a href={video.driveUrl} target="_blank" rel="noreferrer" style={linkIconStyle}><ExternalLink size={12} /></a>}
      <button onClick={onDelete} style={iconDangerStyle}><Trash2 size={13} /></button>
    </div>
  )
}

function FileRow({ attachment, label, compact, onDelete }: { attachment: Attachment; label: string; compact?: boolean; onDelete: () => void }) {
  return (
    <div style={{ ...rowStyle, padding: compact ? "8px 10px" : rowStyle.padding }}>
      <div style={{ ...rowIconStyle, background: "#e11d48" }}><FileText size={16} color="#fff" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...rowTypeStyle, color: "#e11d48" }}>{label}</div>
        <span style={rowTitleStyle}>{attachment.name}</span>
      </div>
      {attachment.url && <a href={attachment.url} target="_blank" rel="noreferrer" style={linkIconStyle}><ExternalLink size={12} /></a>}
      <button onClick={onDelete} style={iconDangerStyle}><Trash2 size={13} /></button>
    </div>
  )
}

function MiniHeader({ title, icon, onAdd }: { title: string; icon: React.ReactNode; onAdd: () => void }) {
  return <div style={miniHeaderStyle}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{icon}{title}</span><button onClick={onAdd} style={smallGhostBtn}><Plus size={12} /> Ajouter</button></div>
}

function VideoCreateForm({ newVideo, setNewVideo, onCreate, onCancel }: { newVideo: { title: string; driveUrl: string; description: string }; setNewVideo: React.Dispatch<React.SetStateAction<{ title: string; driveUrl: string; description: string }>>; onCreate: () => void; onCancel: () => void }) {
  return (
    <div style={inlineListFormStyle}>
      <input autoFocus value={newVideo.title} onChange={e => setNewVideo(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la video..." style={inlineInputStyle} />
      <input value={newVideo.driveUrl} onChange={e => setNewVideo(p => ({ ...p, driveUrl: e.target.value }))} placeholder="Lien Google Drive..." style={inlineInputStyle} />
      <button onClick={onCreate} style={smallPrimaryBtn}>Ajouter</button>
      <button onClick={onCancel} style={smallGhostBtn}><X size={12} /></button>
    </div>
  )
}

const metaTextStyle: React.CSSProperties = { fontSize: 13, color: "#6b7280", fontWeight: 500 }
const primaryBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--accent)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px color-mix(in oklch, var(--accent) 35%, transparent)", flexShrink: 0 }
const ghostBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#475569", fontSize: 13, fontWeight: 800, cursor: "pointer" }
const smallPrimaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", border: "none", borderRadius: 9, background: "var(--accent,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }
const smallGhostBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 9, background: "#fff", color: "#475569", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }
const inlineInputStyle: React.CSSProperties = { flex: 1, minWidth: 0, padding: "7px 12px", border: "1.5px solid color-mix(in oklch, var(--accent) 40%, white)", borderRadius: 8, fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }
const inlineTopFormStyle: React.CSSProperties = { marginBottom: 12, padding: "14px 16px", background: "#fff", borderRadius: 14, border: "1.5px dashed color-mix(in oklch, var(--accent) 40%, white)", display: "flex", gap: 8, alignItems: "center" }
const inlineListFormStyle: React.CSSProperties = { display: "flex", gap: 8, padding: "10px 20px", alignItems: "center", borderTop: "1px solid #f0f1f5", background: "#fafbfd" }
const emptyCardStyle: React.CSSProperties = { padding: "40px 24px", textAlign: "center", background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0" }
const moduleCardStyle: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid #e8ecf3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }
const moduleHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 20px 18px", cursor: "pointer" }
const stepBadgeStyle: React.CSSProperties = { width: 54, height: 54, borderRadius: 13, border: "2px solid color-mix(in oklch, var(--accent) 100%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22, fontWeight: 800, color: "color-mix(in oklch, var(--accent) 85%, black)", letterSpacing: "-0.03em" }
const eyebrowStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#b0b7c8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }
const moduleTitleInputStyle: React.CSSProperties = { width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", fontFamily: "inherit", padding: 0 }
const durationInputStyle: React.CSSProperties = { width: 78, padding: "5px 8px", border: "1px solid #e8ecf3", borderRadius: 8, outline: "none", color: "#475569", fontSize: 12, fontFamily: "inherit" }
const iconSoftStyle: React.CSSProperties = { width: 30, height: 30, border: "none", borderRadius: 8, background: "#f4f6fb", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
const iconDangerStyle: React.CSSProperties = { ...iconSoftStyle, background: "transparent", color: "#ef4444" }
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", borderBottom: "1px solid #f8f9fb", transition: "background 0.12s" }
const rowIconStyle: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }
const rowTypeStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }
const rowTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: "#1f2937", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
const linkIconStyle: React.CSSProperties = { padding: "3px 5px", color: "#9ca3af", borderRadius: 5, display: "flex", alignItems: "center", textDecoration: "none" }
const emptyTextStyle: React.CSSProperties = { padding: "18px 20px", margin: 0, fontSize: 13, color: "#94a3b8", fontWeight: 600 }
const lessonEditorStyle: React.CSSProperties = { margin: "0 20px 14px 68px", padding: 14, borderRadius: 14, background: "#fafbfd", border: "1px solid #eef2f7" }
const lessonTitleInputStyle: React.CSSProperties = { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, fontWeight: 800, color: "#111827", fontFamily: "inherit" }
const textareaStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, resize: "vertical", outline: "none", fontFamily: "inherit", fontSize: 13, color: "#111827" }
const miniPanelStyle: React.CSSProperties = { background: "#fff", border: "1px solid #eef2f7", borderRadius: 12, overflow: "hidden" }
const miniHeaderStyle: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: 800, color: "#111827" }
const addBarStyle: React.CSSProperties = { display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid #f0f1f5", background: "#fcfcfd" }
const addPillStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1px dashed #dbe3ef", borderRadius: 9, background: "#fff", color: "var(--accent)", fontSize: 12, fontWeight: 800, cursor: "pointer" }
const inlineFieldStyle: React.CSSProperties = { width: "100%", border: "none", borderBottom: "1px solid #eef2f7", outline: "none", padding: "2px 0", fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: "inherit", background: "transparent" }
