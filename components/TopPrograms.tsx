"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ProgramCard } from "@/components/program-card"
import { Code, Layers } from "lucide-react"

// 🔹 Types
type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  levelLabel: string
  tags: string[]
  image?: string | null
}

// 🔹 Animations
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
}

export default function TopPrograms() {
  const [activeTab, setActiveTab] = useState<"courses" | "bootcamps">("courses")
  const [courses, setCourses] = useState<Program[]>([])
  const [bootcamps, setBootcamps] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  // 🔹 Fetch featured programs
  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch("/api/featured")
        const data = await res.json()

        if (data.ok) {
          const PB_URL = process.env.NEXT_PUBLIC_PB_URL

          const coursesWithImages = (data.courses || []).map((c: any) => ({
            ...c,
            image: c.coverImage
              ? `${PB_URL}/api/files/courses/${c.id}/${c.coverImage}`
              : null,
          }))

          const bootcampsWithImages = (data.bootcamps || []).map((b: any) => ({
            ...b,
            image: b.coverImage
              ? `${PB_URL}/api/files/bootcamps/${b.id}/${b.coverImage}`
              : null,
          }))

          setCourses(coursesWithImages)
          setBootcamps(bootcampsWithImages)
        }
      } catch (err) {
        console.error("Failed to load featured programs", err)
      } finally {
        setLoading(false)
      }
    }

    loadFeatured()
  }, [])

  const programs = activeTab === "courses" ? courses : bootcamps

  return (
    <section className="w-full px-6 py-0 md:py-10 lg:py-20">
      {/* 🔹 Heading */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-4 md:mb-8 text-center"
      >
        <p className="text-lg font-semibold uppercase tracking-widest">
          Découvrez nos formations et bootcamps{" "}
          <span className="text-accent">les plus populaires</span>
        </p>
      </motion.div>

      {/* 🔹 Tabs */}
      <div className="mb-2 md:mb-8 flex justify-center gap-2 md:gap-4">
     

        <Button
          onClick={() => setActiveTab("courses")}
          variant={activeTab === "courses" ? "default" : "outline"}
          className={`flex items-center gap-2 ${
            activeTab === "courses" ? "bg-[#C84FFF]" : ""
          }`}
        >
          <Code size={18} />
          Formations
        </Button>

           <Button
          onClick={() => setActiveTab("bootcamps")}
          variant={activeTab === "bootcamps" ? "default" : "outline"}
          className={`flex items-center gap-2 ${
            activeTab === "bootcamps" ? "bg-[#C84FFF]" : ""
          }`}
        >
          <Layers size={18} />
          Bootcamps
        </Button>
      </div>

      {/* 🔹 Loading */}
      {loading && (
        <p className="text-center text-muted-foreground">
          Chargement des programmes...
        </p>
      )}

      {/* 🔹 Programs */}
      {!loading && (
        <motion.div
          key={activeTab} // ✅ SINGLE KEY (fixes duplication)
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 📱 Mobile Carousel */}
          <div
            className="
              flex md:hidden
              gap-4
              overflow-x-auto
              snap-x snap-mandatory
              pb-4
              -mx-8 px-1
              scrollbar-hide
            "
          >
            {programs.map((program) => (
              <motion.div
                key={program.id}
                variants={itemVariants}
                className="snap-center min-w-[85%] sm:min-w-[70%]"
              >
                <ProgramCard program={program} variant={activeTab === "bootcamps" ? "bootcamp" : "course"} />
              </motion.div>
            ))}
          </div>

          {/* 🖥 Desktop Grid */}
          <div
            className="
              hidden md:grid
              grid-cols-2 lg:grid-cols-3
              gap-6 lg:gap-8
            "
          >
            {programs.map((program) => (
              <motion.div
                key={program.id}
                variants={itemVariants}
                className="h-full w-full"
              >
                <ProgramCard program={program} variant={activeTab === "bootcamps" ? "bootcamp" : "course"} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  )
}
