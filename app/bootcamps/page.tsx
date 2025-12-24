// app/bootcamps/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, useInView } from "framer-motion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/badge"
import { CheckCircle2, TrendingUp, Clock } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

type BootcampCard = {
  id: string
  title: string
  shortDescription?: string
  durationLabel?: string
  levelLabel?: string
  hours?: number
  steps: string[]
  tags: string[]
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

  /* ✅ Fetch bootcamps from API route */
  useEffect(() => {
    const fetchBootcamps = async () => {
      try {
        const res = await fetch("/api/bootcamps")
        if (!res.ok) throw new Error(`Failed to fetch bootcamps (${res.status})`)
        const data = await res.json()
        setBootcamps(data.bootcamps)
      } catch (err) {
        console.error("Error fetching bootcamps", err)
      }
    }
    fetchBootcamps()
  }, [])

  /* Build tag filters */
  const tagMap = new Map<string, string>()
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
    setAnimKey((k) => k + 1)
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
          </div>

          {/* Category filters */}
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

          {/* Bootcamps grid */}
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
