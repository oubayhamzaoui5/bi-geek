"use client"

import { ChevronDown, Play, FileText, Code, Lock } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

type ContentType = "video" | "document" | "exercise"

interface Content {
  title: string
  type: ContentType
  playbackId?: string
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
  /**
   * ✅ Used for guest (course OR bootcamp)
   * - For course: modulesFromPb = course modules
   * - For bootcamp: modulesFromPb = formations (courses)
   *   and each formation contains "lessons" = its modules
   *   and each module contains "contents" = its lessons
   */
  modulesFromPb?: {
    title: string
    duration: string
    lessons: {
      title: string
      duration: string
      contents?: { title: string; type?: ContentType; playbackId?: string }[]
    }[]
  }[]
}

export function CurriculumSection({
  variant = "student",
  context = "course",
  modulesFromPb,
}: CurriculumSectionProps) {
  const isGuest = variant === "guest"
  const isBootcamp = context === "bootcamp"

  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [expandedLessons, setExpandedLessons] = useState<Record<number, Set<number>>>({})
  const router = useRouter()

  // -----------------------------
  // DATA: course curriculum (unchanged)
  // -----------------------------
  const courseModules: Module[] = [
    {
      title: "Module 1 : Fondamentaux de Python",
      duration: "8 heures",
      lessons: [
        {
          title: "Introduction à Python",
          duration: "45 min",
          contents: [
            {
              title: "Vidéo Introduction",
              type: "video",
              playbackId: "hpnBz15009TAvXFOUS01uO4g5bkrAp8byb01RIRSo01sUAI",
            },
            { title: "Document PDF", type: "document" },
            { title: "Exercice pratique", type: "exercise" },
          ],
        },
        {
          title: "Variables et types de données",
          duration: "1h 15 min",
          contents: [
            { title: "Vidéo", type: "video", playbackId: "aBCdEFgHiJKLmNopQR12stuv3" },
            { title: "Exercice code", type: "exercise" },
          ],
        },
      ],
    },
    {
      title: "Module 2 : Pandas et manipulation de données",
      duration: "12 heures",
      lessons: [
        {
          title: "Introduction à Pandas",
          duration: "1h",
          contents: [
            { title: "Vidéo", type: "video", playbackId: "pqrsTUVwxYz0123456789abcd" },
            { title: "Document PDF", type: "document" },
          ],
        },
        {
          title: "DataFrames et Series",
          duration: "1h 45 min",
          contents: [
            { title: "Vidéo", type: "video", playbackId: "efghijklMNOP345678qrstuv" },
            { title: "Exercice pratique", type: "exercise" },
          ],
        },
        {
          title: "Nettoyage de données",
          duration: "2h",
          contents: [
            { title: "Vidéo", type: "video", playbackId: "wxyz1234ABCD5678EFghijkl" },
            { title: "Document PDF", type: "document" },
          ],
          locked: true,
        },
      ],
    },
    {
      title: "Module 3 : Visualisation de données",
      duration: "10 heures",
      locked: true,
      lessons: [
        {
          title: "Matplotlib basique",
          duration: "1h 30 min",
          contents: [{ title: "Vidéo", type: "video", playbackId: "QWErTYuiOP12asdf3456zxcv" }],
        },
        {
          title: "Seaborn avancé",
          duration: "2h",
          contents: [{ title: "Vidéo", type: "video", playbackId: "ZXcvBNmm1234ASDfghJKL890" }],
        },
      ],
    },
  ]

  // -----------------------------
  // DATA: bootcamp curriculum (unchanged hardcoded fallback)
  // -----------------------------
  const bootcampModules: Module[] = [
    {
      title: "Formation 1 : HTML / CSS / JavaScript",
      duration: "40 heures",
      lessons: [
        {
          title: "Module : Bases du Web (HTML & CSS)",
          duration: "10h",
          contents: [
            { title: "Leçon : Structure HTML", type: "video" },
            { title: "Leçon : Styles CSS essentiels", type: "video" },
            { title: "Leçon : Support PDF", type: "document" },
          ],
        },
        {
          title: "Module : JavaScript Fondamentaux",
          duration: "14h",
          contents: [
            { title: "Leçon : Variables, fonctions, boucles", type: "video" },
            { title: "Leçon : Exercices JS", type: "exercise" },
          ],
        },
      ],
    },
    {
      title: "Formation 2 : SQL & Bases de données",
      duration: "24 heures",
      lessons: [
        {
          title: "Module : Introduction à SQL",
          duration: "8h",
          contents: [
            { title: "Leçon : CRUD avec SQL", type: "video" },
            { title: "Leçon : Exercices de requêtes", type: "exercise" },
          ],
        },
        {
          title: "Module : Modélisation & Jointures",
          duration: "8h",
          contents: [
            { title: "Leçon : Modélisation relationnelle", type: "video" },
            { title: "Leçon : Jointures avancées", type: "video" },
          ],
        },
      ],
    },
    {
      title: "Formation 3 : React & SPA",
      duration: "36 heures",
      lessons: [
        {
          title: "Module : Bases de React",
          duration: "12h",
          contents: [
            { title: "Leçon : Components & Props", type: "video" },
            { title: "Leçon : JSX & événements", type: "video" },
          ],
        },
        {
          title: "Module : React avancé & API",
          duration: "16h",
          locked: true,
          contents: [
            { title: "Leçon : Hooks avancés", type: "video" },
            { title: "Leçon : Appels API & erreurs", type: "video" },
            { title: "Leçon : TP : Application complète", type: "exercise" },
          ],
        },
      ],
    },
  ]

  // ✅ Use PB for guest (course OR bootcamp) if modulesFromPb is provided
  let modules: Module[]
  const hasPbModules = isGuest && !!modulesFromPb

  if (hasPbModules) {
    modules = modulesFromPb.map((m) => ({
      title: m.title,
      duration: m.duration,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        duration: l.duration,
        locked: false,
        // ✅ if PB provided "contents", use them; else keep empty
        contents: (l.contents ?? []).map((c) => ({
          title: c.title,
          type: c.type ?? "video",
          playbackId: c.playbackId,
        })),
      })),
      locked: false,
    }))
  } else {
    modules = isBootcamp ? bootcampModules : courseModules
  }

  const renderContentIcon = (type: ContentType) => {
    switch (type) {
      case "video":
        return <Play size={16} className="text-accent flex-shrink-0" />
      case "document":
        return <FileText size={16} className="text-accent flex-shrink-0" />
      case "exercise":
        return <Code size={16} className="text-accent flex-shrink-0" />
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

    if (content.type === "document") {
      router.push("/pdf-viewer")
    } else if (content.type === "video" && content.playbackId) {
      const q = new URLSearchParams({ pid: content.playbackId, title: content.title })
      router.push(`/video-viewer?${q.toString()}`)
    }
  }

  const unitLabel = isBootcamp ? "modules" : "leçons"

  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground">
        {isBootcamp ? "Curriculum du bootcamp" : "Curriculum"}
      </h2>

      <div className="space-y-3">
        {modules.map((module, moduleIndex) => {
          const isModuleLockedForStudent = !!module.locked && !isGuest && !isBootcamp

          return (
            <div key={moduleIndex} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleModule(moduleIndex)}
                className={`w-full p-4 flex items-center justify-between transition-colors ${
                  isModuleLockedForStudent ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  {isModuleLockedForStudent ? (
                    <Lock size={20} className="text-foreground/70" />
                  ) : (
                    <ChevronDown
                      size={20}
                      className={`text-accent transition-transform ${
                        expandedModules.has(moduleIndex) ? "rotate-180" : ""
                      }`}
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">{module.title}</h3>
                    <p className="text-sm text-muted-foreground">{module.duration}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-accent">
                  {module.lessons.length} {unitLabel}
                </span>
              </button>

              {expandedModules.has(moduleIndex) && (
                <div className="bg-muted/30 border-t border-border p-4 space-y-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isLessonLockedForStudent = !!lesson.locked && !isGuest && !isBootcamp
                    const canExpandLesson = isBootcamp ? true : !isGuest && !lesson.locked

                    return (
                      <div key={lessonIndex} className="space-y-1">
                        <button
                          onClick={() => {
                            if (canExpandLesson) toggleLesson(moduleIndex, lessonIndex)
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded transition-colors ${
                            isLessonLockedForStudent
                              ? "opacity-60 cursor-not-allowed"
                              : isGuest && !isBootcamp
                              ? "cursor-default"
                              : "hover:bg-muted/50 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isBootcamp ? (
                              <ChevronDown
                                size={16}
                                className={`text-accent transition-transform ${
                                  expandedLessons[moduleIndex]?.has(lessonIndex) ? "rotate-180" : ""
                                }`}
                              />
                            ) : isGuest ? (
                              <div className="w-2 h-2 rounded-full bg-accent/70" />
                            ) : isLessonLockedForStudent ? (
                              <Lock size={16} className="text-foreground/70" />
                            ) : (
                              <ChevronDown
                                size={16}
                                className={`text-accent transition-transform ${
                                  expandedLessons[moduleIndex]?.has(lessonIndex) ? "rotate-180" : ""
                                }`}
                              />
                            )}

                            <p className="font-medium text-sm text-foreground">{lesson.title}</p>
                          </div>

                          {!isGuest && (
                            <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                          )}
                        </button>

                        {expandedLessons[moduleIndex]?.has(lessonIndex) && !lesson.locked && (
                          <div className="pl-6">
                            <ul className="space-y-1">
                              {lesson.contents.map((content, contentIndex) => {
                                const clickable = !isGuest && !isBootcamp
                                return (
                                  <li key={contentIndex}>
                                    <div
                                      onClick={clickable ? () => handleContentClick(content) : undefined}
                                      className={
                                        "flex items-center gap-2 p-2 rounded-md transition-colors " +
                                        "hover:bg-muted/40 " +
                                        (clickable ? "cursor-pointer" : "cursor-default")
                                      }
                                    >
                                      {!isBootcamp ? (
                                        <>
                                          {renderContentIcon(content.type)}
                                          <span className="text-sm text-foreground">{content.title}</span>
                                        </>
                                      ) : (
                                        <span className="text-sm text-foreground flex items-center gap-3">                               <div className="w-2 h-2 rounded-full bg-accent/70" />
 {content.title}</span>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
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
  )
}
