"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react"

type Track = {
  title: string
  description: string
  hours: number
  steps: string[]
}

const tracks: Track[] = [
  {
    title: "BI Analyst",
    description: "Devenez expert en analyse et visualisation de données",
    hours: 48,
    steps: [
      "Fondamentaux SQL et bases de données",
      "Maîtrise de Power BI",
      "Modélisation de données avancée",
      "DAX et mesures calculées",
      "Déploiement et gouvernance",
    ],
  },
  {
    title: "Data Engineer",
    description: "Construisez des pipelines de données robustes",
    hours: 60,
    steps: [
      "Python pour l'ingénierie data",
      "ETL et orchestration",
      "Architecture cloud (Azure/AWS)",
      "Big Data et Spark",
      "DataOps et CI/CD",
    ],
  },
  {
    title: "Full-Stack Web",
    description: "Développez des applications web modernes",
    hours: 72,
    steps: [
      "HTML, CSS et JavaScript moderne",
      "React et Next.js",
      "TypeScript et patterns avancés",
      "APIs et bases de données",
      "Déploiement et performance",
    ],
  },
]

const titleVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const, delay: 0.4 + i * 0.18 },
  }),
}

type TrackCardProps = {
  track: Track
  className?: string
}

function TrackCard({ track, className = "" }: TrackCardProps) {
  return (
    <Card className={`hover:shadow-lg transition-shadow h-full flex flex-col ${className}`}>
      {/* Card Header */}
      <CardHeader>
        <CardTitle className="text-md md:text-xl">{track.title}</CardTitle>
        <p className="text-sm text-muted-foreground text-pretty mt-0 md:mt-1">
          {track.description}
        </p>
      </CardHeader>

      {/* Card Content */}
      <CardContent>
        <ul className="m-0 pl-1.5 sm:pl-2 list-none space-y-1.5 sm:space-y-2">
          {track.steps.map((step, index) => (
            <li key={index} className="flex items-start gap-1.5 md:gap-2">
              {/* Tick visible on mobile + desktop */}
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-xs md:text-sm text-pretty">
                {step}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      {/* Footer */}
      <CardFooter className="mt-auto flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{track.hours}h</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-accent hover:text-[#7d3d9f] hover:bg-transparent cursor-pointer"
        >
          Voir le programme
          <TrendingUp className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

export function Tracks() {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, margin: "-80px" })
  const [activeIndex, setActiveIndex] = useState(0)

  // Auto-change every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % tracks.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % tracks.length)
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + tracks.length) % tracks.length)
  }

  return (
    <section className="py-6 md:py-18 -mx-2 md:mx:0" id="programmes">
      <div ref={sectionRef} className="container mx-auto px-3 md:px-4">
        {/* Section Title */}
        <div className="text-center mb-8 md:mb-12">
          <motion.h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent mb-1 md:mb-4"
            variants={titleVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            Nos Bootcamps
          </motion.h2>

          <motion.p
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: "easeOut" as const, delay: 0.2 }}
          >
            Des parcours structurés pour vous guider de débutant à expert.
          </motion.p>
        </div>

        {/* MOBILE: 1 bootcamp at a time with navigation + animation */}
        <div className="md:hidden">
          {/* Fixed height wrapper so all 3 bootcamps have the same height on phone */}
          <div className="min-h-[360px] flex">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: "easeOut" as const }}
                className="w-full"
              >
                {/* Also enforce min height on the card itself */}
                <TrackCard track={tracks[activeIndex]} className="min-h-[360px]" />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              className="cursor-pointer"
              aria-label="Bootcamp précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              {tracks.map((track, index) => (
                <button
                  key={track.title}
                  onClick={() => setActiveIndex(index)}
                  className="cursor-pointer"
                  aria-label={`Voir le bootcamp ${track.title}`}
                >
                  <span
                    className={
                      "block rounded-full transition-all " +
                      (index === activeIndex
                        ? "w-4 h-2 bg-accent"
                        : "w-2 h-2 bg-muted-foreground/40")
                    }
                  />
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="cursor-pointer"
              aria-label="Bootcamp suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* DESKTOP (md+): 3 cards grid */}
        <div className="hidden md:grid grid-cols-3 gap-4 sm:gap-6">
          {tracks.map((track, i) => (
            <motion.div
              key={track.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.5 }}
            >
              <TrackCard track={track} />
            </motion.div>
          ))}
        </div>

        {/* Global CTA */}
        <div className="mt-8 md:mt-10 text-center">
          <Button size="lg" className="bg-accent hover:bg-[#7d3d9f] text-white cursor-pointer">
            Voir tous les bootcamps
          </Button>
        </div>
      </div>
    </section>
  )
}
