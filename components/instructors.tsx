"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import PocketBase, { RecordModel } from "pocketbase"
import { ChevronLeft, ChevronRight } from "lucide-react"

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "http://127.0.0.1:8090")

type InstructorRecord = RecordModel & {
  avatar?: string
  firstName: string
  lastName: string
  description: string
}

type Instructor = {
  id: string
  firstName: string
  lastName: string
  description: string
  avatarUrl: string
}

const DESKTOP_PER_SLIDE = 4

export function Instructors() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [mobileIdx, setMobileIdx]     = useState(0)
  const [desktopSlide, setDesktopSlide] = useState(0)

  useEffect(() => {
    pb.collection("instructors")
      .getFullList<InstructorRecord>({ sort: "+created" })
      .then((records) =>
        setInstructors(
          records.map((r) => ({
            id: r.id,
            firstName: r.firstName,
            lastName: r.lastName,
            description: r.description,
            avatarUrl: r.avatar
              ? pb.files.getUrl(r, r.avatar, { thumb: "300x300" })
              : "/placeholder.svg",
          }))
        )
      )
      .catch(console.error)
  }, [])

  // Mobile auto-rotate
  useEffect(() => {
    if (instructors.length <= 1) return
    const t = setInterval(() => setMobileIdx((p) => (p + 1) % instructors.length), 5000)
    return () => clearInterval(t)
  }, [instructors.length])

  useEffect(() => { setDesktopSlide(0) }, [instructors.length])

  const totalDesktopSlides = Math.max(1, Math.ceil(instructors.length / DESKTOP_PER_SLIDE))
  const desktopVisible = instructors.slice(
    desktopSlide * DESKTOP_PER_SLIDE,
    desktopSlide * DESKTOP_PER_SLIDE + DESKTOP_PER_SLIDE
  )

  if (!instructors.length) return null

  return (
    <section id="formateurs" className="w-full py-20 md:py-28 border-b border-border">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                Notre équipe
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Apprenez avec des<br />
              <span className="text-accent">experts actifs.</span>
            </h2>
          </div>

          {/* Desktop nav arrows (only if carousel needed) */}
          {totalDesktopSlides > 1 && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setDesktopSlide((p) => (p - 1 + totalDesktopSlides) % totalDesktopSlides)}
                className="w-9 h-9 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
                aria-label="Précédent"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setDesktopSlide((p) => (p + 1) % totalDesktopSlides)}
                className="w-9 h-9 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
                aria-label="Suivant"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* DESKTOP grid */}
        <div className="hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={desktopSlide}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-border"
            >
              {desktopVisible.map((inst, i) => (
                <InstructorCard key={inst.id} instructor={inst} index={i} total={desktopVisible.length} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* MOBILE slider */}
        <div className="md:hidden">
          <div className="relative min-h-[280px] overflow-hidden border border-border">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileIdx}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <InstructorCard instructor={instructors[mobileIdx]} index={0} total={1} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile controls */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setMobileIdx((p) => (p - 1 + instructors.length) % instructors.length)}
              className="w-9 h-9 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
              aria-label="Précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5">
              {instructors.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setMobileIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === mobileIdx ? "w-5 bg-accent" : "w-1.5 bg-border"}`}
                  aria-label={`Formateur ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setMobileIdx((p) => (p + 1) % instructors.length)}
              className="w-9 h-9 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
              aria-label="Suivant"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function InstructorCard({ instructor, index, total }: { instructor: Instructor; index: number; total: number }) {
  const isLast = index === total - 1
  return (
    <div className={`group p-7 ${!isLast ? "border-r border-border" : ""} hover:bg-accent/[0.03] transition-colors duration-300 h-full`}>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-accent/40 transition-all duration-300">
          <img
            src={instructor.avatarUrl}
            alt={`${instructor.firstName} ${instructor.lastName}`}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm text-foreground group-hover:text-accent transition-colors duration-300">
            {instructor.firstName} {instructor.lastName}
          </h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-4">
            {instructor.description}
          </p>
        </div>
      </div>
    </div>
  )
}
