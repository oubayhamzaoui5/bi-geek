// app/bootcamps/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import PocketBase from "pocketbase"
import { motion, useInView } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/badge"
import { CheckCircle2, TrendingUp, Clock } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

type Course = {
  id: string
  title: string
  tags?: string[]
}

// align with new PB structure (and keep hours optional as legacy fallback)
type Bootcamp = {
  id: string
  title: string
  shortDescription?: string
  durationLabel?: string
  levelLabel?: string
  hours?: number
}

type BootcampCourse = {
  id: string
  bootcamp: string
  course: string
  order: number
  expand?: {
    course?: Course
  }
}

type BootcampCard = Bootcamp & {
  steps: string[] // ordered course titles
  tags: string[]  // derived from child courses tags
}

const levelColors: Record<string, string> = {
  Débutant: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Intermédiaire: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Avancé: "bg-red-500/10 text-red-700 dark:text-red-400",
}

function BootcampCardView({ bootcamp }: { bootcamp: BootcampCard }) {
  const primaryTag = bootcamp.tags[0]?.trim() || "Bootcamp"
  const levelLabel = bootcamp.levelLabel || "Tous niveaux"
  const levelClass =
    levelColors[levelLabel] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-300"

  const duration =
    bootcamp.durationLabel ??
    (typeof bootcamp.hours === "number" ? `${bootcamp.hours}h` : "--")

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
         

          {/* Level badge */}
          <Badge className={levelClass}>{levelLabel}</Badge>
        </div>

        <CardTitle className="text-md md:text-xl">{bootcamp.title}</CardTitle>
        <p className="text-sm text-muted-foreground text-pretty mt-0 md:mt-1 mb-0">
          {bootcamp.shortDescription}
        </p>
      </CardHeader>

      <CardContent>
        <ul className="m-0 pl-1.5 sm:pl-2 list-none space-y-1.5 sm:space-y-2 mt-0">
          {bootcamp.steps.map((step, index) => (
            <li key={index} className="flex items-start gap-1.5 md:gap-2">
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-xs md:text-xs text-pretty">{step}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{duration}</span>
        </div>

        <Link href={`/bootcamp/${bootcamp.id}`} className="cursor-pointer">
          <Button
            variant="ghost"
            size="sm"
            className="text-accent hover:text-[#7d3d9f] hover:bg-transparent cursor-pointer"
          >
            Voir le programme
            <TrendingUp className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function BootcampsPage() {
  const [bootcamps, setBootcamps] = useState<BootcampCard[]>([])
  const [selectedTag, setSelectedTag] = useState<string>("All")
  const [animKey, setAnimKey] = useState(0)
  const [started, setStarted] = useState(false)

  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.3, margin: "-80px" })

  useEffect(() => {
    if (inView) setStarted(true)
  }, [inView])

  useEffect(() => {
    const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090")

    const load = async () => {
      try {
        // 1) Bootcamps
        const boots = await pb.collection("bootcamps").getFullList<Bootcamp>({
          filter: "isPublished = true",
          sort: "-created",
        })

        if (!boots.length) {
          setBootcamps([])
          return
        }

        // 2) Pivot rows with expanded course (needs course.title + course.tags)
        const filter = boots.map((b) => `bootcamp="${b.id}"`).join(" || ")
        const pivots = await pb.collection("bootcamp_courses").getFullList<BootcampCourse>({
          filter,
          sort: "bootcamp,order",
          expand: "course",
        })

        // 3) Build per-bootcamp steps + tags (tags derived from child courses)
        const stepsMap = new Map<string, string[]>()
        const tagsMap = new Map<string, string[]>() // store raw tags (will dedupe later)

        for (const p of pivots) {
          const c = p.expand?.course
          if (!c) continue

          // steps (ordered because query sorted by bootcamp,order)
          const stepsArr = stepsMap.get(p.bootcamp) ?? []
          stepsArr.push(c.title)
          stepsMap.set(p.bootcamp, stepsArr)

          // tags from child course
          const rawTags = Array.isArray(c.tags) ? c.tags : []
          const tagArr = tagsMap.get(p.bootcamp) ?? []
          tagArr.push(...rawTags)
          tagsMap.set(p.bootcamp, tagArr)
        }

        // 4) Final cards
        const cards: BootcampCard[] = boots.map((b) => {
          const rawTags = tagsMap.get(b.id) ?? []
          // dedupe tags case-insensitively, keep first original
          const m = new Map<string, string>()
          rawTags.forEach((t) => {
            const tag = (t ?? "").trim()
            if (!tag) return
            const key = tag.toLowerCase()
            if (!m.has(key)) m.set(key, tag)
          })

          return {
            ...b,
            steps: stepsMap.get(b.id) ?? [],
            tags: Array.from(m.values()),
          }
        })

        setBootcamps(cards)
      } catch (err) {
        console.error("Error fetching bootcamps", {
          status: (err as any)?.status,
          message: (err as any)?.message,
          data: (err as any)?.data,
        })
      }
    }

    load()
  }, [])

  // Build tag filters from all bootcamps (derived tags from children courses)
  const tagMap = new Map<string, string>() // lower -> original
  bootcamps.forEach((b) => {
    b.tags.forEach((rawTag) => {
      const tag = (rawTag ?? "").trim()
      if (!tag) return
      const key = tag.toLowerCase()
      if (!tagMap.has(key)) tagMap.set(key, tag)
    })
  })

  const categories = ["All", ...Array.from(tagMap.values())]

  const filteredBootcamps =
    selectedTag === "All"
      ? bootcamps
      : bootcamps.filter((b) =>
          b.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()),
        )

  const titleVariants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  }

  const filterItemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.35, ease: "easeOut", delay: 0.15 + i * 0.06 },
    }),
  }

  const handleCategoryClick = (category: string) => {
    setSelectedTag(category)
    setAnimKey((k) => k + 1) // retrigger grid animation like formations
  }

  return (
    <>
      <Navbar />
      <section className="py-12 min-h-[80vh]">
        <div ref={sectionRef} className="container mx-auto px-4">
          <div className="text-center mb-4">
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-accent mb-2"
              variants={titleVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
            >
              Nos Bootcamps
            </motion.h1>

            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty"
              initial={{ opacity: 0, y: 14 }}
              animate={started ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            >
              Des parcours intensifs et structurés, filtrables par catégories de formations.
            </motion.p>

            <motion.div
              className="mt-4 flex justify-center"
              initial={{ opacity: 0, y: 16 }}
              animate={started ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.18 }}
            />
          </div>

          {/* Filtres catégories (from children courses tags) */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {categories.map((category, i) => (
              <motion.div
                key={category}
                custom={i}
                variants={filterItemVariants}
                initial="hidden"
                animate={started ? "show" : "hidden"}
              >
                <Button
                  variant={selectedTag === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryClick(category)}
                  className={
                    selectedTag === category
                      ? "bg-accent hover:bg-[#7d3d9f] cursor-pointer"
                      : "cursor-pointer"
                  }
                >
                  {category === "All" ? "Tous" : category}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Grille bootcamps (same style as formations grid) */}
          <div key={animKey} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-18">
            {filteredBootcamps.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <BootcampCardView bootcamp={b} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
