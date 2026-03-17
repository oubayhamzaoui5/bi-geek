"use client"

import {
  ChevronDown,
  Play,
  FileText,
  Image as ImageIcon,
  Lock,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { getPDFViewerUrl } from "@/lib/pdf"

type ContentType = "video" | "document" | "exercise"

interface Content {
  title: string
  type: ContentType
  playbackId?: string
  href?: string
  lessonId?: string
  filename?: string
  courseId?: string
}

interface Lesson {
  title: string
  duration: string
  contents: Content[]
  locked?: boolean
}

interface Module {
  title: string
  duration: string
  lessons: Lesson[]
  locked?: boolean
}

type CurriculumSectionProps = {
  variant?: "student" | "guest"
  context?: "course" | "bootcamp"
  courseId?: string
  modulesFromPb?: {
    title: string
    duration: string
    lessons: {
      title: string
      duration: string
      locked?: boolean
      contents?: Content[]
    }[]
  }[]
}

const isPdf = (href: string) => href.toLowerCase().includes(".pdf")
const parsePocketBasePdf = (href: string) => {
  const match = href.match(/\/api\/files\/course_lessons\/([^/]+)\/([^/?#]+\.pdf)/i)
  if (!match) return null
  const [, lessonId, filename] = match
  return { lessonId, filename: filename.replace(/\.pdf$/i, "") }
}

const moduleVariants = {
  open: { height: "auto", opacity: 1 },
  collapsed: { height: 0, opacity: 0 },
}

const lessonListVariants = {
  open: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
  collapsed: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
}

const lessonItemVariants = {
  open: { opacity: 1, y: 0 },
  collapsed: { opacity: 0, y: -6 },
}

export function CurriculumSection({
  variant = "student",
  context = "course",
  courseId,
  modulesFromPb,
}: CurriculumSectionProps) {
  const isGuest = variant === "guest"
  const isBootcamp = context === "bootcamp"

  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [expandedLessons, setExpandedLessons] = useState<Record<number, Set<number>>>({})
  const [activeLesson, setActiveLesson] = useState<string | null>(null)
  const router = useRouter()

  const modules: Module[] = (modulesFromPb ?? []).map((m) => ({
    title: m.title,
    duration: m.duration,
    lessons: m.lessons.map((l) => ({
      title: l.title,
      duration: l.duration,
      locked: l.locked ?? false,
      contents: l.contents ?? [],
    })),
  }))

  const totalLessons = useMemo(() => modules.reduce((sum, m) => sum + m.lessons.length, 0), [modules])

  const renderContentIcon = (type: ContentType) => {
    switch (type) {
      case "video":
        return <Play size={14} className="text-blue-600" />
      case "document":
        return <FileText size={14} className="text-amber-600" />
      case "exercise":
        return <ImageIcon size={14} className="text-purple-600" />
    }
  }

  const toggleModule = (index: number) => {
    const next = new Set(expandedModules)
    next.has(index) ? next.delete(index) : next.add(index)
    setExpandedModules(next)
  }

  const toggleLesson = (moduleIndex: number, lessonIndex: number) => {
    const current = expandedLessons[moduleIndex] || new Set<number>()
    const next = new Set(current)
    next.has(lessonIndex) ? next.delete(lessonIndex) : next.add(lessonIndex)
    setExpandedLessons({ ...expandedLessons, [moduleIndex]: next })
  }

  const handleContentClick = (content: Content) => {
    if (isBootcamp || isGuest) return

    if (content.type === "document" && content.href) {
      if (isPdf(content.href)) {
        const parsed = parsePocketBasePdf(content.href)
        const resolvedCourseId = content.courseId ?? courseId
        const resolvedLessonId = content.lessonId ?? parsed?.lessonId
        const resolvedFilename = content.filename ?? parsed?.filename

        if (resolvedCourseId && resolvedLessonId && resolvedFilename) {
          router.push(getPDFViewerUrl(resolvedCourseId, resolvedLessonId, resolvedFilename))
        } else if (!parsed) {
          window.open(content.href, "_blank", "noreferrer")
        } else {
          console.warn("Missing course or lesson identifiers for PDF viewer link.")
        }
      } else {
        window.open(content.href, "_blank", "noreferrer")
      }
      return
    }

    if (content.type === "video") {
      if (content.playbackId) {
        const q = new URLSearchParams({ pid: content.playbackId, title: content.title })
        router.push(`/video-viewer?${q.toString()}`)
        return
      }
      if (content.href) {
        window.open(content.href, "_blank", "noreferrer")
      }
    }
  }

  const lessonStatus = (lesson: Lesson, moduleIndex: number, lessonIndex: number) => {
    if (lesson.locked) return "locked"
    if (moduleIndex === 0 && lessonIndex === 0) return "in_progress"
    return "completed"
  }

  const moduleStatus = (module: Module) => {
    const total = module.lessons.length
    const locked = module.lessons.filter((l) => l.locked).length
    if (locked === total) return "locked"
    if (locked === 0) return "completed"
    return "in_progress"
  }

  const unitLabel = isBootcamp ? "modules" : "leçons"

  return (
    <div className="rounded-2xl border border-border bg-card/90 backdrop-blur p-6 lg:p-8 space-y-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Curriculum</h2>
          <p className="text-xs text-muted-foreground">
            {totalLessons} {unitLabel} au total
          </p>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-accent">Modules</span>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Aucun contenu disponible pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, moduleIndex) => {
            const status = moduleStatus(module)
            const accentColor =
              status === "completed"
                ? "border-emerald-500/40"
                : status === "in_progress"
                ? "border-accent/60"
                : "border-border"

            return (
              <div
                key={moduleIndex}
                className={`rounded-xl border border-border overflow-hidden bg-muted/20 ${
                  expandedModules.has(moduleIndex) ? "bg-muted/40" : ""
                }`}
              >
                <button
                  onClick={() => toggleModule(moduleIndex)}
                  className={`w-full p-4 flex items-center justify-between transition-colors ${
                    module.locked && !isGuest && !isBootcamp
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className={`flex items-center gap-4 text-left border-l-2 ${accentColor} pl-3`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-xs font-semibold text-muted-foreground border border-border">
                      {String(moduleIndex + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">{module.title}</h3>
                      <p className="text-xs text-muted-foreground">{module.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                      {module.lessons.length} {unitLabel}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-accent transition-transform ${
                        expandedModules.has(moduleIndex) ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {expandedModules.has(moduleIndex) && (
                    <motion.div
                      key="module-content"
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={moduleVariants}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border p-4 space-y-2">
                        <motion.ul
                          variants={lessonListVariants}
                          initial="collapsed"
                          animate="open"
                          className="space-y-2"
                        >
                          {module.lessons.map((lesson, lessonIndex) => {
                            const isLocked = !!lesson.locked && !isGuest && !isBootcamp
                            const canExpandLesson = isBootcamp ? true : !isGuest && !lesson.locked
                            const status = lessonStatus(lesson, moduleIndex, lessonIndex)
                            const lessonKey = `${moduleIndex}-${lessonIndex}`
                            const isActive = activeLesson === lessonKey

                            return (
                              <motion.li key={lessonIndex} variants={lessonItemVariants}>
                                <button
                                  onClick={() => {
                                    if (canExpandLesson) {
                                      toggleLesson(moduleIndex, lessonIndex)
                                      setActiveLesson(lessonKey)
                                    }
                                  }}
                                  className={`group w-full flex items-center justify-between rounded-xl border border-border px-4 py-3 text-left transition ${
                                    isLocked
                                      ? "opacity-60 pointer-events-none"
                                      : "hover:bg-muted/40"
                                  } ${
                                    isActive
                                      ? "bg-accent/10 border-accent/40 shadow-[0_0_24px_hsl(var(--accent)/0.25)] animate-[pulse_3s_ease-in-out_infinite]"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                                        status === "completed"
                                          ? "bg-emerald-500/10 border-emerald-500/40"
                                          : status === "in_progress"
                                          ? "bg-accent/15 border-accent/50"
                                          : "bg-muted/30 border-border"
                                      }`}
                                    >
                                      {status === "completed" && <Check size={14} className="text-emerald-600" />}
                                      {status === "in_progress" && (
                                        <Loader2 size={14} className="text-accent animate-spin" />
                                      )}
                                      {status === "locked" && <Lock size={14} className="text-muted-foreground" />}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                                      <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {!isGuest && <span>{lesson.duration}</span>}
                                    <ChevronDown
                                      size={14}
                                      className={`text-accent transition-transform ${
                                        expandedLessons[moduleIndex]?.has(lessonIndex) ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>
                                </button>

                                <AnimatePresence initial={false}>
                                  {expandedLessons[moduleIndex]?.has(lessonIndex) && !lesson.locked && (
                                    <motion.div
                                      key="lesson-content"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pl-10 pt-2 pb-3 space-y-2">
                                        {lesson.contents.length === 0 ? (
                                          <div className="text-xs text-muted-foreground py-2">
                                            Aucun fichier ou contenu pour cette leçon.
                                          </div>
                                        ) : (
                                          <ul className="space-y-2">
                                            {lesson.contents.map((content, contentIndex) => {
                                              const clickable =
                                                !isGuest &&
                                                !isBootcamp &&
                                                !!(content.playbackId || content.href)
                                              const label =
                                                content.filename ??
                                                content.title ??
                                                (content.href ? content.href.split("/").pop() : "Ressource")

                                              return (
                                                <li key={contentIndex}>
                                                  <div
                                                    onClick={clickable ? () => handleContentClick(content) : undefined}
                                                    className={`group flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 transition ${
                                                      clickable ? "cursor-pointer hover:bg-muted/40" : "cursor-default"
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-3">
                                                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40">
                                                        {renderContentIcon(content.type)}
                                                      </span>
                                                      <div>
                                                        <p className="text-xs font-medium text-foreground">{label}</p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                          {content.type === "video"
                                                            ? "Vidéo"
                                                            : content.type === "document"
                                                            ? "Article"
                                                            : "Ressource"}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <button
                                                      className={`text-[11px] uppercase tracking-[0.2em] text-accent/80 opacity-0 transition group-hover:opacity-100 ${
                                                        clickable ? "" : "hidden"
                                                      }`}
                                                    >
                                                      Ouvrir
                                                      <ExternalLink size={12} className="inline ml-2" />
                                                    </button>
                                                  </div>
                                                </li>
                                              )
                                            })}
                                          </ul>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.li>
                            )
                          })}
                        </motion.ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
