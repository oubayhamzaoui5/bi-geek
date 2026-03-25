"use client"

import { motion, useInView, AnimatePresence } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import PocketBase, { RecordModel } from "pocketbase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ---- PocketBase setup ----
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

const ITEMS_PER_DESKTOP_SLIDE = 4

export function Instructors() {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, margin: "-80px" })

  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [mobileIndex, setMobileIndex] = useState(0)
  const [desktopSlide, setDesktopSlide] = useState(0)

  // ---- Fetch instructors from PocketBase ----
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const records = await pb
          .collection("instructors")
          .getFullList<InstructorRecord>({
            sort: "+created",
          })

        const mapped: Instructor[] = records.map((record) => ({
          id: record.id,
          firstName: record.firstName,
          lastName: record.lastName,
          description: record.description,
          avatarUrl: record.avatar
            ? pb.files.getUrl(record, record.avatar, { thumb: "300x300" })
            : "/placeholder.svg",
        }))

        setInstructors(mapped)
        setMobileIndex(0)
        setDesktopSlide(0)
      } catch (error) {
        console.error("Error fetching instructors from PocketBase:", error)
      }
    }

    fetchInstructors()
  }, [])

  // ---- Auto-change on mobile every 5s ----
  useEffect(() => {
    if (instructors.length <= 1) return

    const interval = setInterval(() => {
      setMobileIndex((prev) => (prev + 1) % instructors.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [instructors.length])

  // Reset desktop slide when number of instructors changes
  useEffect(() => {
    setDesktopSlide(0)
  }, [instructors.length])

  const handleMobileNext = () => {
    if (!instructors.length) return
    setMobileIndex((prev) => (prev + 1) % instructors.length)
  }

  const handleMobilePrev = () => {
    if (!instructors.length) return
    setMobileIndex((prev) => (prev - 1 + instructors.length) % instructors.length)
  }

  const desktopTotalSlides = Math.max(
    1,
    Math.ceil(instructors.length / ITEMS_PER_DESKTOP_SLIDE),
  )

  const handleDesktopNext = () => {
    setDesktopSlide((prev) => (prev + 1) % desktopTotalSlides)
  }

  const handleDesktopPrev = () => {
    setDesktopSlide((prev) => (prev - 1 + desktopTotalSlides) % desktopTotalSlides)
  }

  // ---- Animations ----
  const titleVariants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut" as const, delay: 0.25 + i * 0.12 },
    }),
  }

  const renderInstructorCard = (instructor: Instructor) => {
    return (
      <Card className="text-center hover:shadow-lg transition-shadow h-full flex flex-col min-h-[340px]">
        <CardContent className="pt-6 flex flex-col flex-1">
          <img
            src={instructor.avatarUrl}
            alt={`${instructor.firstName} ${instructor.lastName}`}
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
          />
          <h3 className="text-lg font-bold mb-1">
            {instructor.firstName} {instructor.lastName}
          </h3>

          <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
            {instructor.description}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!instructors.length) {
    // Optional: small placeholder; you can replace by skeleton or return null
    return null
  }

  return (
    <section id="formateurs" className="py-8 -mx-2 md:mx-0">
      <div ref={sectionRef} className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-[#954ABF] mb-4"
            variants={titleVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            Notre Équipe
          </motion.h2>

          <motion.p
            className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty"
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: "easeOut" as const, delay: 0.12 }}
          >
            Apprenez avec des professionnels passionnés et expérimentés
          </motion.p>
        </div>

        {/* MOBILE: slider, 1 instructor at a time */}
        <div className="md:hidden">
          <div className="min-h-[380px] flex">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileIndex}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: "easeOut" as const }}
                className="w-full"
              >
                {renderInstructorCard(instructors[mobileIndex])}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile navigation */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={handleMobilePrev}
              className="cursor-pointer"
              aria-label="Formateur précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              {instructors.map((inst, index) => (
                <button
                  key={inst.id}
                  onClick={() => setMobileIndex(index)}
                  className="cursor-pointer"
                  aria-label={`Voir le formateur ${inst.firstName} ${inst.lastName}`}
                >
                  <span
                    className={
                      "block rounded-full transition-all " +
                      (index === mobileIndex
                        ? "w-4 h-2 bg-[#954ABF]"
                        : "w-2 h-2 bg-muted-foreground/40")
                    }
                  />
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleMobileNext}
              className="cursor-pointer"
              aria-label="Formateur suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* DESKTOP: grid (<=4) or carousel (>4) */}
        <div className="hidden md:block">
          {instructors.length <= ITEMS_PER_DESKTOP_SLIDE ? (
            // Original grid for up to 4 instructors
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {instructors.map((instructor, i) => (
                <motion.div
                  key={instructor.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.5 }}
                >
                  {renderInstructorCard(instructor)}
                </motion.div>
              ))}
            </div>
          ) : (
            // Carousel if more than 4 instructors
            <div className="flex flex-col gap-4">
              <div className="min-h-[360px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={desktopSlide}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.4, ease: "easeOut" as const }}
                  >
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {instructors
                        .slice(
                          desktopSlide * ITEMS_PER_DESKTOP_SLIDE,
                          desktopSlide * ITEMS_PER_DESKTOP_SLIDE + ITEMS_PER_DESKTOP_SLIDE,
                        )
                        .map((instructor, i) => (
                          <motion.div
                            key={instructor.id}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, amount: 0.5 }}
                          >
                            {renderInstructorCard(instructor)}
                          </motion.div>
                        ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Desktop navigation */}
              <div className="flex items-center justify-between mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDesktopPrev}
                  className="cursor-pointer"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: desktopTotalSlides }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setDesktopSlide(index)}
                      className="cursor-pointer"
                      aria-label={`Voir la slide ${index + 1}`}
                    >
                      <span
                        className={
                          "block rounded-full transition-all " +
                          (index === desktopSlide
                            ? "w-4 h-2 bg-[#954ABF]"
                            : "w-2 h-2 bg-muted-foreground/40")
                        }
                      />
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDesktopNext}
                  className="cursor-pointer"
                  aria-label="Suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
