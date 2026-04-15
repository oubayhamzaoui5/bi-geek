"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProgramCard } from "@/components/program-card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useRouter } from "next/navigation"

type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  levelLabel: string
  tags: string[]
  image?: string | null
}

function SkeletonCard() {
  return (
    <div className="border border-border animate-pulse flex flex-col">
      <div className="aspect-video bg-muted" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-5 w-2/3 bg-muted" />
        <div className="h-3 w-full bg-muted" />
        <div className="h-3 w-4/5 bg-muted" />
        <div className="h-3 w-1/2 bg-muted mt-auto pt-3" />
      </div>
    </div>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Program[]>([])
  const router = useRouter()

  const initialCategory =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("category") || "All"
      : "All"
  const [selectedTag, setSelectedTag] = useState<string>(initialCategory)
  const [animKey, setAnimKey] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("/api/courses")
        if (!res.ok) throw new Error(`Failed to fetch courses (${res.status})`)
        const data = await res.json()
        const PB_URL = process.env.NEXT_PUBLIC_PB_URL

        const normalizedCourses: Program[] = (data.courses || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          shortDescription: c.shortDescription,
          durationLabel: c.durationLabel,
          levelLabel: c.levelLabel,
          tags: c.tags ?? [],
          image: c.coverImage
            ? c.coverImage.startsWith("http")
              ? c.coverImage
              : `${PB_URL}/api/files/courses/${c.id}/${c.coverImage}`
            : null,
        }))

        setCourses(normalizedCourses)
      } catch (err) {
        console.error("Error fetching courses", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  const tagMap = new Map<string, string>()
  courses.forEach((course) => {
    course.tags.forEach((rawTag) => {
      const tag = (rawTag ?? "").trim()
      if (!tag) return
      const key = tag.toLowerCase()
      if (!tagMap.has(key)) tagMap.set(key, tag)
    })
  })
  const categories = ["All", ...Array.from(tagMap.values())]

  const filteredCourses =
    selectedTag === "All"
      ? courses
      : courses.filter((course) =>
          course.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()),
        )

  const handleCategoryClick = (category: string) => {
    setSelectedTag(category)
    setAnimKey((k) => k + 1)
    const url =
      category === "All" ? "/courses" : `/courses?category=${encodeURIComponent(category)}`
    router.push(url)
  }

  return (
    <>
      <Navbar />

      <main className="px-4 md:px-16">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden -mx-4 md:-mx-16 px-4 md:px-16 pt-20 pb-16 md:pt-28 md:pb-20 border-b border-border"
        style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
      >
        {/* Ghost word */}
        <div
          aria-hidden
          className="pointer-events-none select-none absolute right-0 top-1/2 -translate-y-1/2 font-display font-black leading-none text-accent"
          style={{ fontSize: "clamp(5rem, 18vw, 18rem)", opacity: 0.045, letterSpacing: "-0.04em" }}
        >
          FORM.
        </div>

        <div className="relative z-10 max-w-4xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="h-px w-8 bg-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
              Catalogue de formations
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="font-display font-black text-foreground leading-[0.95] tracking-tight mb-6"
            style={{ fontSize: "clamp(2.6rem, 6.5vw, 5.5rem)" }}
          >
            Maîtrisez les outils<br />
            <span className="text-accent">qui recrutent.</span>
          </motion.h1>

          {/* Description + stat */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col sm:flex-row sm:items-end gap-6"
          >
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
              Explorez nos parcours par domaine — de la data à la BI, du cloud au
              développement — et progressez à votre rythme.
            </p>
            {!loading && (
              <div className="shrink-0 border-l-2 border-accent pl-5">
                <div className="font-display font-black text-4xl text-foreground leading-none">
                  {courses.length}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                  formations disponibles
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Filters + Grid ── */}
      <section className="py-12 md:py-16 min-h-[60vh]">
        <div className="container mx-auto px-4 md:px-6">

          {/* Filters */}
          <div className="mb-10">
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 bg-muted animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {categories.map((category, i) => (
                  <motion.button
                    key={category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onClick={() => handleCategoryClick(category)}
                    className={[
                      "font-mono text-[11px] uppercase tracking-[0.15em] px-4 py-2 border transition-all duration-200",
                      selectedTag === category
                        ? "border-accent bg-accent text-white"
                        : "border-border text-muted-foreground hover:border-accent hover:text-accent",
                    ].join(" ")}
                  >
                    {category === "All" ? "Tous" : category}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-24 text-center">
              <div
                aria-hidden
                className="font-display font-black text-accent/10 leading-none mb-4 select-none"
                style={{ fontSize: "clamp(4rem, 12vw, 10rem)" }}
              >
                0
              </div>
              <p className="font-display font-bold text-xl text-foreground mb-2">
                Aucune formation trouvée
              </p>
              <p className="text-muted-foreground text-sm">
                Essayez une autre catégorie ou revenez bientôt.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={animKey}
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.07 } },
                }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
                    }}
                  >
                    <ProgramCard program={course} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>

      </main>

      <Footer />
    </>
  )
}
