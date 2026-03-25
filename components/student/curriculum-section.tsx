"use client"

import {
  ChevronDown,
  Play,
  FileText,
  Image as ImageIcon,
  Lock,
  Check,
  ExternalLink,
  BookOpen,
  Clock,
  Layers,
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
    locked?: boolean
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

/* ─── animation variants ─────────────────────────── */
const moduleBodyVariants = {
  open:      { height: "auto", opacity: 1,  transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] } },
  collapsed: { height: 0,      opacity: 0,  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
}

const staggerList = {
  open:      { transition: { staggerChildren: 0.055, delayChildren: 0.07 } },
  collapsed: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
}

const lessonItem = {
  open:      { opacity: 1, y: 0,  transition: { duration: 0.25 } },
  collapsed: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const contentListVariants = {
  open:      { height: "auto", opacity: 1,  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  collapsed: { height: 0,      opacity: 0,  transition: { duration: 0.2,  ease: [0.4, 0, 0.2, 1] } },
}

/* ─── content type config ────────────────────────── */
const contentConfig = {
  video:    { color: "#3b82f6", bg: "rgba(59,130,246,0.10)", label: "Vidéo",       Icon: Play },
  document: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "Document PDF", Icon: FileText },
  exercise: { color: "#a855f7", bg: "rgba(168,85,247,0.10)", label: "Ressource",    Icon: ImageIcon },
}

/* ─── component ──────────────────────────────────── */
export function CurriculumSection({
  variant = "student",
  context = "course",
  courseId,
  modulesFromPb,
}: CurriculumSectionProps) {
  const isGuest    = variant === "guest"
  const isBootcamp = context === "bootcamp"

  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]))
  const [expandedLessons, setExpandedLessons] = useState<Record<number, Set<number>>>({})
  const router = useRouter()

  const modules: Module[] = (modulesFromPb ?? []).map((m) => ({
    title:   m.title,
    duration: m.duration,
    locked:  m.locked ?? false,
    lessons: m.lessons.map((l) => ({
      title:    l.title,
      duration: l.duration,
      locked:   l.locked ?? false,
      contents: l.contents ?? [],
    })),
  }))

  const totalLessons   = useMemo(() => modules.reduce((s, m) => s + m.lessons.length, 0), [modules])
  const totalDuration  = modules.map((m) => m.duration).join(" · ")
  const unitLabel      = isBootcamp ? "modules" : "leçons"

  const toggleModule = (i: number) => {
    const next = new Set(expandedModules)
    next.has(i) ? next.delete(i) : next.add(i)
    setExpandedModules(next)
  }

  const toggleLesson = (mi: number, li: number) => {
    const cur  = expandedLessons[mi] || new Set<number>()
    const next = new Set(cur)
    next.has(li) ? next.delete(li) : next.add(li)
    setExpandedLessons({ ...expandedLessons, [mi]: next })
  }

  const handleContentClick = (content: Content) => {
    if (isBootcamp || isGuest) return
    if (content.type === "document" && content.href) {
      if (isPdf(content.href)) {
        const parsed          = parsePocketBasePdf(content.href)
        const resolvedCourseId  = content.courseId ?? courseId
        const resolvedLessonId  = content.lessonId ?? parsed?.lessonId
        const resolvedFilename  = content.filename ?? parsed?.filename
        if (resolvedCourseId && resolvedLessonId && resolvedFilename) {
          router.push(getPDFViewerUrl(resolvedCourseId, resolvedLessonId, resolvedFilename))
        } else if (!parsed) {
          window.open(content.href, "_blank", "noreferrer")
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
      } else if (content.href) {
        window.open(content.href, "_blank", "noreferrer")
      }
    }
  }

  const lessonStatus = (lesson: Lesson, module: Module, mi: number, li: number) => {
    if (module.locked || lesson.locked) return "locked"
    if (mi === 0 && li === 0)            return "in_progress"
    return "completed"
  }

  const moduleStatus = (module: Module) => {
    if (module.locked) return "locked"
    const lockedCount = module.lessons.filter((l) => l.locked).length
    if (lockedCount === 0 && module.lessons.length > 0) return "completed"
    return "in_progress"
  }

  /* ── progress bar width per module ── */
  const moduleProgress = (module: Module) => {
    const total  = module.lessons.length
    const locked = module.lessons.filter((l) => l.locked).length
    return total === 0 ? 0 : Math.round(((total - locked) / total) * 100)
  }

  return (
    <section className="curriculum-root">
      {/* ── header ── */}
      <div className="curriculum-header">
        <div className="curriculum-header-left">
          <div className="curriculum-eyebrow">
            <Layers size={13} />
            Programme de formation
          </div>
          <h2 className="curriculum-title">Curriculum</h2>
          <div className="curriculum-meta">
            <span className="curriculum-meta-pill">
              <BookOpen size={12} />
              {totalLessons} {unitLabel}
            </span>
            <span className="curriculum-meta-pill">
              <Clock size={12} />
              {modules.length} modules
            </span>
          </div>
        </div>
      </div>

      {/* ── module list ── */}
      {modules.length === 0 ? (
        <div className="curriculum-empty">
          Aucun contenu disponible pour le moment.
        </div>
      ) : (
        <div className="curriculum-list">
          {modules.map((module, mi) => {
            const status    = moduleStatus(module)
            const isOpen    = expandedModules.has(mi)
            const progress  = moduleProgress(module)
            const isLocked  = status === "locked" && !isGuest && !isBootcamp
            const completed = status === "completed"

            return (
              <div key={mi} className={`module-card ${isOpen ? "module-card--open" : ""} ${isLocked ? "module-card--locked" : ""}`}>
                {/* ── module header button ── */}
                <button
                  className="module-trigger"
                  onClick={() => { if (!isLocked) toggleModule(mi) }}
                  aria-expanded={isOpen}
                >
                  {/* index bubble */}
                  <div className={`module-index ${completed ? "module-index--done" : ""} ${isOpen ? "module-index--active" : ""}`}>
                    {isLocked    ? <Lock    size={14} /> :
                     completed   ? <Check   size={15} strokeWidth={2.8} /> :
                                   <span>{String(mi + 1).padStart(2, "0")}</span>}
                  </div>

                  <div className="module-info">
                    <h3 className="module-title">{module.title}</h3>
                    <div className="module-subtitle">
                      <span>{module.duration}</span>
                      <span className="module-dot" />
                      <span>{module.lessons.length} {unitLabel}</span>
                    </div>

                    {/* progress bar */}
                    <div className="module-progress-track" aria-hidden="true">
                      <motion.div
                        className="module-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                      />
                    </div>
                  </div>

                  <div className={`module-chevron ${isOpen ? "module-chevron--open" : ""}`}>
                    <ChevronDown size={18} />
                  </div>
                </button>

                {/* ── lessons ── */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={moduleBodyVariants}
                      className="module-body"
                    >
                      <motion.ul
                        variants={staggerList}
                        initial="collapsed"
                        animate="open"
                        className="lesson-list"
                      >
                        {module.lessons.map((lesson, li) => {
                          const lStatus     = lessonStatus(lesson, module, mi, li)
                          const lLocked     = lStatus === "locked"
                          const canExpand   = isBootcamp ? true : !isGuest && !lLocked
                          const lExpanded   = !!expandedLessons[mi]?.has(li)

                          return (
                            <motion.li key={li} variants={lessonItem} className="lesson-item">
                              <button
                                className={`lesson-trigger ${lLocked ? "lesson-trigger--locked" : ""} ${lExpanded ? "lesson-trigger--open" : ""}`}
                                onClick={() => { if (canExpand) toggleLesson(mi, li) }}
                              >
                                {/* status dot */}
                                <div className={`lesson-dot ${
                                  lStatus === "completed"  ? "lesson-dot--done"       :
                                  lStatus === "in_progress"? "lesson-dot--active"     :
                                                             "lesson-dot--locked"
                                }`}>
                                  {lStatus === "completed"   && <Check size={11} strokeWidth={3} />}
                                  {lStatus === "in_progress" && <Play  size={9}  className="fill-current ml-px" />}
                                  {lStatus === "locked"      && <Lock  size={10} />}
                                </div>

                                <div className="lesson-info">
                                  <span className="lesson-title">{lesson.title}</span>
                                  <span className="lesson-meta">
                                    <Clock size={10} />
                                    {lesson.duration}
                                    {lesson.contents.length > 0 && (
                                      <>
                                        <span className="lesson-meta-sep">·</span>
                                        {lesson.contents.length} fichier{lesson.contents.length > 1 ? "s" : ""}
                                      </>
                                    )}
                                  </span>
                                </div>

                                <div className={`lesson-chevron ${lExpanded ? "lesson-chevron--open" : ""}`}>
                                  <ChevronDown size={15} />
                                </div>
                              </button>

                              {/* ── content items ── */}
                              <AnimatePresence initial={false}>
                                {lExpanded && !lLocked && (
                                  <motion.div
                                    key="contents"
                                    initial="collapsed"
                                    animate="open"
                                    exit="collapsed"
                                    variants={contentListVariants}
                                    className="content-list-wrap"
                                  >
                                    {lesson.contents.length === 0 ? (
                                      <p className="content-empty">Aucun fichier pour cette leçon.</p>
                                    ) : (
                                      <ul className="content-list">
                                        {lesson.contents.map((c, ci) => {
                                          const cfg      = contentConfig[c.type]
                                          const CIcon    = cfg.Icon
                                          const label    = c.title ?? c.filename ?? (c.href ? c.href.split("/").pop() : "Ressource")
                                          const clickable = !isGuest && !!(c.playbackId || c.href)

                                          return (
                                            <li key={ci}>
                                              <div
                                                className={`content-item ${clickable ? "content-item--clickable" : ""}`}
                                                onClick={clickable ? () => handleContentClick(c) : undefined}
                                                style={{ "--type-color": cfg.color, "--type-bg": cfg.bg } as React.CSSProperties}
                                              >
                                                <span className="content-icon">
                                                  <CIcon size={13} />
                                                </span>
                                                <span className="content-label">{label}</span>
                                                <span className="content-badge">{cfg.label}</span>
                                                {clickable && (
                                                  <span className="content-arrow">
                                                    <ExternalLink size={12} />
                                                  </span>
                                                )}
                                              </div>
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.li>
                          )
                        })}
                      </motion.ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* ─────────── scoped styles ─────────── */}
      <style>{`
        /* ── tokens ── */
        .curriculum-root {
          --cur-radius:    16px;
          --cur-radius-sm: 10px;
          --cur-gap:       1px;

          /* palette — light */
          --col-surface:   hsl(0 0% 100%);
          --col-card:      hsl(0 0% 100%);
          --col-card-alt:  hsl(220 14% 97%);
          --col-border:    hsl(220 13% 91%);
          --col-border-hi: hsl(220 13% 84%);

          --col-text:      hsl(220 20% 12%);
          --col-muted:     hsl(215 12% 42%);
          --col-subtle:    hsl(215 10% 62%);

          --col-accent:    oklch(0.68 0.28 308);
          --col-accent-lo: oklch(0.68 0.28 308 / 0.10);
          --col-done:      oklch(0.68 0.28 308 / 0.75);
          --col-done-lo:   oklch(0.68 0.28 308 / 0.10);

          font-family: 'DM Sans', 'Geist', 'Inter', system-ui, sans-serif;
          color: var(--col-text);
          background: transparent;
          space-y: 0;
        }

        /* ── header ── */
        .curriculum-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 0 0 28px 0;
        }
        .curriculum-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--col-accent);
          margin-bottom: 10px;
        }
        .curriculum-title {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--col-text);
          margin: 0 0 14px 0;
          line-height: 1.1;
        }
        .curriculum-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .curriculum-meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 500;
          color: var(--col-muted);
          background: var(--col-card);
          border: 1px solid var(--col-border);
          padding: 4px 10px;
          border-radius: 99px;
        }

        /* ── empty state ── */
        .curriculum-empty {
          border: 1.5px dashed var(--col-border);
          border-radius: var(--cur-radius);
          padding: 32px 24px;
          text-align: center;
          font-size: 14px;
          color: var(--col-muted);
        }

        /* ── module list ── */
        .curriculum-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── module card ── */
        .module-card {
          border-radius: var(--cur-radius);
          border: 1px solid var(--col-border);
          background: var(--col-card);
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .module-card--open {
          border-color: var(--col-border-hi);
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        }
        .module-card--locked {
          opacity: 0.55;
        }

        /* ── module trigger ── */
        .module-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }
        .module-trigger:hover {
          background: var(--col-card-alt);
        }

        /* ── module index bubble ── */
        .module-index {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1.5px solid var(--col-border-hi);
          background: var(--col-card-alt);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: var(--col-muted);
          letter-spacing: -0.02em;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .module-index--done {
          background: oklch(0.68 0.28 308 / 0.12);
          border-color: oklch(0.68 0.28 308 / 0.5);
          color: oklch(0.68 0.28 308);
        }
        .module-index--active {
          background: var(--col-accent-lo);
          border-color: var(--col-accent);
          color: var(--col-accent);
        }

        /* ── module info ── */
        .module-info {
          flex: 1;
          min-width: 0;
        }
        .module-title {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--col-text);
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .module-subtitle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--col-muted);
          font-weight: 500;
          margin-bottom: 10px;
        }
        .module-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--col-subtle);
        }

        /* ── progress bar ── */
        .module-progress-track {
          height: 3px;
          background: var(--col-border);
          border-radius: 99px;
          overflow: hidden;
          max-width: 200px;
        }
        .module-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, oklch(0.68 0.28 308) 0%, oklch(0.72 0.22 308) 100%);
          border-radius: 99px;
        }

        /* ── module chevron ── */
        .module-chevron {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--col-subtle);
          transition: transform 0.3s ease, background 0.15s, color 0.15s;
        }
        .module-chevron--open {
          transform: rotate(180deg);
          color: var(--col-accent);
          background: var(--col-accent-lo);
        }

        /* ── module body ── */
        .module-body {
          overflow: hidden;
          border-top: 1px solid var(--col-border);
        }

        /* ── lesson list ── */
        .lesson-list {
          list-style: none;
          margin: 0;
          padding: 8px 12px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* ── lesson item ── */
        .lesson-item {
          border-radius: var(--cur-radius-sm);
          overflow: hidden;
        }

        /* ── lesson trigger ── */
        .lesson-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          border-radius: var(--cur-radius-sm);
          transition: background 0.15s;
        }
        .lesson-trigger:hover {
          background: var(--col-card-alt);
        }
        .lesson-trigger--locked {
          opacity: 0.45;
          pointer-events: none;
        }
        .lesson-trigger--open {
          background: var(--col-card-alt);
        }

        /* ── lesson status dot ── */
        .lesson-dot {
          flex-shrink: 0;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .lesson-dot--done {
          background: oklch(0.68 0.28 308 / 0.12);
          color: oklch(0.68 0.28 308);
        }
        .lesson-dot--active {
          background: var(--col-accent-lo);
          color: var(--col-accent);
        }
        .lesson-dot--locked {
          background: var(--col-card-alt);
          color: var(--col-subtle);
        }

        /* ── lesson info ── */
        .lesson-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .lesson-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--col-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
        }
        .lesson-meta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--col-subtle);
          font-weight: 500;
        }
        .lesson-meta-sep {
          color: var(--col-border-hi);
        }

        /* ── lesson chevron ── */
        .lesson-chevron {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          color: var(--col-subtle);
          transition: transform 0.25s ease, color 0.15s;
        }
        .lesson-chevron--open {
          transform: rotate(180deg);
          color: var(--col-accent);
        }

        /* ── content list ── */
        .content-list-wrap {
          overflow: hidden;
        }
        .content-empty {
          font-size: 12.5px;
          color: var(--col-muted);
          padding: 10px 14px 14px 52px;
          margin: 0;
        }
        .content-list {
          list-style: none;
          margin: 0;
          padding: 4px 10px 10px 52px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* ── content item ── */
        .content-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.15s;
          border: 1px solid transparent;
        }
        .content-item--clickable {
          cursor: pointer;
        }
        .content-item--clickable:hover {
          background: var(--type-bg, var(--col-card-alt));
          border-color: color-mix(in srgb, var(--type-color, var(--col-accent)) 25%, transparent);
        }
        .content-item--clickable:hover .content-label {
          color: var(--type-color, var(--col-accent));
        }

        .content-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: var(--type-bg, var(--col-card-alt));
          color: var(--type-color, var(--col-muted));
        }
        .content-label {
          flex: 1;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--col-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.15s;
        }
        .content-badge {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--type-color, var(--col-subtle));
          background: var(--type-bg, var(--col-card-alt));
          padding: 2px 7px;
          border-radius: 99px;
        }
        .content-arrow {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          color: var(--col-subtle);
          opacity: 0;
          transition: opacity 0.15s;
        }
        .content-item--clickable:hover .content-arrow {
          opacity: 1;
        }

        /* ── responsive ── */
        @media (max-width: 480px) {
          .module-trigger  { padding: 14px 14px; }
          .module-index    { width: 34px; height: 34px; border-radius: 10px; }
          .module-title    { font-size: 14px; }
          .content-badge   { display: none; }
          .module-progress-track { max-width: 120px; }
        }
      `}</style>
    </section>
  )
}