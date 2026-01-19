"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "./badge"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link" 

const techBadges = ["Power BI", "SQL", "Python", "React", "Azure", "Machine Learning"] as const

const COURSES = [
  "Business Intelligence",
  "Data Analytics",
  "Data Engineering",
  "Machine Learning",
  "Cloud & DevOps",
  "Développement Web",
] as const

type Phase = "typing" | "pausing" | "deleting"

function RightHeroImage() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 hidden md:block z-0"
    >
      {/* Floating wrapper */}
      <motion.div
        className="relative"
        animate={{ y: [0, 0, 0] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      >
        <div
          className="absolute right-[-5%] top-1/2 -translate-y-1/2 aspect-square w-[70%] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(closest-side, #954ABF33, transparent 65%)" }}
        />
        <Image
          src="/hero.webp"
          alt=""
          width={800}
          height={800}
          priority
          className="w-[45vw] h-auto object-contain drop-shadow-xl select-none"
          sizes="(min-width: 1024px) 28vw, (min-width: 768px) 34vw, 0px"
          style={{
            maskImage: "linear-gradient(to left, black 80%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, black 80%, transparent 100%)",
          }}
        />
      </motion.div>
    </div>
  )
}

export function Hero() {
  const [courseIndex, setCourseIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("typing")
  const [displayText, setDisplayText] = useState("")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [startTyping, setStartTyping] = useState(false)

  const TYPING_MS = 55
  const DELETING_MS = 35
  const PAUSE_MS = 1200

  useEffect(() => {
    const t = setTimeout(() => setStartTyping(true), 200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!startTyping) return
    const current = COURSES[courseIndex]

    if (phase === "typing") {
      if (displayText.length < current.length) {
        timeoutRef.current = setTimeout(
          () => setDisplayText(current.slice(0, displayText.length + 1)),
          TYPING_MS
        )
      } else {
        setPhase("pausing")
      }
    } else if (phase === "deleting") {
      if (displayText.length > 0) {
        timeoutRef.current = setTimeout(
          () => setDisplayText(current.slice(0, displayText.length - 1)),
          DELETING_MS
        )
      } else {
        setCourseIndex((i) => (i + 1) % COURSES.length)
        setPhase("typing")
      }
    } else {
      timeoutRef.current = setTimeout(() => setPhase("deleting"), PAUSE_MS)
    }

    return () => timeoutRef.current && clearTimeout(timeoutRef.current)
  }, [displayText, courseIndex, phase, startTyping])

  const appear = {
    hidden: { opacity: 0, y: 14 },
    show: (d: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: "easeOut", delay: d },
    }),
  }

  return (
    <section className="relative overflow-hidden pt-20 md:py-40 -mx-2 -mb-16 md:mb-0 md:mx-0 ">
      <RightHeroImage />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="w-full max-w-[780px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Title */}
          <div className="mb-1 md:mb-2">
            <motion.h1
              className="text-2xl sm:text-2xl md:text-4xl lg:text-5xl font-bold leading-tight text-balance"
              variants={appear}
              initial="hidden"
              animate="show"
              custom={0}
            >
              <span>
                Formations modernes <br /> en{" "}
              </span>
              <span className="text-accent">{startTyping ? displayText : ""}</span>
              <span
                className="inline-block align-middle w-[2px] md:w-[3px] h-[1em] bg-accent ml-1 animate-pulse"
                aria-hidden="true"
              />
            </motion.h1>
          </div>

          {/* Description */}
          <motion.p
            className="text-base sm:text-base md:text-lg text-muted-foreground text-pretty mb-4 md:mb-5 leading-relaxed"
            variants={appear}
            initial="hidden"
            animate={startTyping ? "show" : "hidden"}
            custom={0.15}
          >
            Des parcours concrets en Business Intelligence, Data, Web & Cloud pour accélérer votre carrière.
            Apprenez avec des experts et obtenez des compétences recherchées par les entreprises.
          </motion.p>

    {/* CTA */}
<motion.div
  className="flex flex-col sm:flex-row gap-4 mb-6"
  variants={appear}
  initial="hidden"
  animate={startTyping ? "show" : "hidden"}
  custom={0.45}
>
  {/* Primary: bootcamps */}
  <Button
    asChild
    size="lg"
    className="bg-accent hover:bg-[#7d3d9f] text-white cursor-pointer text-base sm:text-lg"
  >
    <Link href="/bootcamps">
      Découvrir nos bootcamps
      <ArrowRight className="ml-2 h-4 w-4" />
    </Link>
  </Button>

  {/* Secondary: formations (inverted) */}
  <Button
    asChild
    size="lg"
    className="bg-white/80 text-accent border border-accent cursor-pointer text-base sm:text-lg hover:bg-accent hover:text-white"
    variant="outline"
  >
    <Link href="/formations">
      Découvrir nos formations
    </Link>
  </Button>
</motion.div>


          {/* Tech badges */}
          <motion.div
            className="flex flex-wrap gap-2"
            initial="hidden"
            animate={startTyping ? "show" : "hidden"}
            variants={{
              hidden: { opacity: 1 },
              show: {
                opacity: 1,
                transition: { delayChildren: 0.75, staggerChildren: 0.08 },
              },
            }}
          >
            {techBadges.map((tech) => (
              <motion.div
                key={tech}
                variants={{
                  hidden: { opacity: 0, scale: 0.9, y: 6 },
                  show: {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { duration: 0.3, ease: "easeOut" },
                  },
                }}
              >
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {tech}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
