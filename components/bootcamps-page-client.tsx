"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { ProgramCard } from "@/components/program-card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

// ✅ Skeleton component for loading placeholders
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-300 dark:bg-gray-700 animate-pulse rounded ${className}`} />
}

// ✅ Bootcamp type
type Bootcamp = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  levelLabel: string
  tags: string[]
  coverImage?: string | null
}

export default function BootcampsPage() {
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([])
  const [selectedTag, setSelectedTag] = useState<string>("All")
  const [animKey, setAnimKey] = useState(0)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(true)

  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.3, margin: "-80px" })

  useEffect(() => {
    if (inView) setStarted(true)
  }, [inView])

  /* ✅ Fetch + normalize bootcamps */
  useEffect(() => {
    const fetchBootcamps = async () => {
      try {
        const res = await fetch("/api/bootcamps")
        if (!res.ok) throw new Error(`Failed to fetch bootcamps (${res.status})`)
        const data = await res.json()
        const PB_URL = process.env.NEXT_PUBLIC_PB_URL

        const normalizedBootcamps: Bootcamp[] = (data.bootcamps || []).map((b: any) => ({
          id: b.id,
          title: b.title,
          shortDescription: b.shortDescription || "",
          durationLabel: b.durationLabel || "--",
          levelLabel: b.levelLabel || "Tous niveaux",
          tags: b.tags ?? [],
          coverImage: b.coverImage
            ? b.coverImage.startsWith("http")
              ? b.coverImage
              : `${PB_URL}/api/files/bootcamps/${b.id}/${b.coverImage}`
            : null,
        }))

        setBootcamps(normalizedBootcamps)
      } catch (err) {
        console.error("Error fetching bootcamps", err)
      } finally {
        setLoading(false)
      }
    }

    fetchBootcamps()
  }, [])

  /* ✅ Build unique tag filters */
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

  /* 🎬 Animations */
  const titleVariants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  }

  const filterItemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.35, ease: "easeOut" as const, delay: 0.15 + i * 0.06 },
    }),
  }

  const handleCategoryClick = (category: string) => {
    setSelectedTag(category)
    setAnimKey((k) => k + 1)
  }

  return (
    <>
      <Navbar />

      <section className="py-4 min-h-[80vh]">
        <div ref={sectionRef} className="container mx-auto px-4">
          {/* 🔹 Title */}
          <div className="text-center mb-4">
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-accent mb-2"
              variants={titleVariants}
              initial="hidden"
              animate={started ? "show" : "hidden"}
            >
              Nos Bootcamps
            </motion.h1>

            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty"
              initial={{ opacity: 0, y: 14 }}
              animate={started ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" as const, delay: 0.1 }}
            >
              Des parcours intensifs et filtrables par catégories de formation.
            </motion.p>
          </div>

          {/* 🔹 Category Filters */}
          {loading ? (
            <div className="flex gap-2 overflow-x-auto px-4 sm:px-12">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-24 h-8 rounded-full" />
              ))}
            </div>
          ) : (
            <>
              {/* 📱 Mobile Carousel */}
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 md:hidden -mx-4 px-4 scrollbar-hide">
                {categories.map((category, i) => (
                  <motion.div
                    key={category}
                    custom={i}
                    variants={filterItemVariants}
                    initial="hidden"
                    animate="show"
                    className="snap-center"
                  >
                    <Button
                      size="sm"
                      variant={selectedTag === category ? "default" : "outline"}
                      onClick={() => handleCategoryClick(category)}
                      className={selectedTag === category ? "bg-accent hover:bg-accent/90" : ""}
                    >
                      {category === "All" ? "Tous" : category}
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* 🖥 Desktop Grid */}
              <div className="hidden md:flex flex-wrap justify-center gap-2 mb-6 px-4 sm:px-12">
                {categories.map((category, i) => (
                  <motion.div
                    key={category}
                    custom={i}
                    variants={filterItemVariants}
                    initial="hidden"
                    animate="show"
                  >
                    <Button
                      size="sm"
                      variant={selectedTag === category ? "default" : "outline"}
                      onClick={() => handleCategoryClick(category)}
                      className={selectedTag === category ? "bg-accent hover:bg-accent/90" : ""}
                    >
                      {category === "All" ? "Tous" : category}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* 🔹 Bootcamps Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-gray-300 dark:border-gray-700 rounded-md p-4 flex flex-col gap-3 animate-pulse"
                >
                  <div className="h-6 w-1/2 bg-gray-300 rounded"></div>
                  <div className="h-32 bg-gray-300 rounded"></div>
                  <div className="h-4 w-full bg-gray-300 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredBootcamps.length === 0 ? (
            <p className="text-center text-muted-foreground mt-8">
              Aucun bootcamp disponible pour cette catégorie
            </p>
          ) : (
            <div key={animKey} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-8">
              {filteredBootcamps.map((b) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" as const }}
                >
                  <ProgramCard
                    program={{
                      id: b.id,
                      title: b.title,
                      shortDescription: b.shortDescription,
                      durationLabel: b.durationLabel,
                      tags: b.tags,
                      image: b.coverImage,
                    }}
                    variant="bootcamp"
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
