"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

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

function HeroImage() {
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/hero-animation.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load hero animation (${response.status})`)
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setAnimationData(data)
      })
      .catch((error) => {
        console.error(error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div aria-hidden className="relative pointer-events-none z-10 -ml-4 md:-ml-28">
      <div className="relative">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] aspect-square rounded-full blur-[100px] opacity-20"
          style={{ background: "radial-gradient(closest-side, #C84FFF, transparent 70%)" }}
        />
        {animationData ? (
          <DotLottieReact
            data={animationData}
            loop
            autoplay
            className="w-full h-auto select-none"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="aspect-[185/243] w-full" />
        )}
      </div>
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
    const t = setTimeout(() => setStartTyping(true), 300)
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
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [displayText, courseIndex, phase, startTyping])

  return (
    <section className="relative overflow-hidden pt-16 pb-12 md:py-28 -mx-4 md:-mx-16 px-4 md:px-16">
      {/* Ambient glow blobs — animated */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[580px] h-[580px] rounded-full blur-[110px]"
        style={{ background: "#C84FFF", opacity: 0.18 }}
        animate={{ x: [0, 45, -15, 0], y: [0, -25, 35, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-[640px] h-[640px] rounded-full blur-[130px]"
        style={{ background: "#C84FFF", opacity: 0.13 }}
        animate={{ x: [0, -35, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[100px]"
        style={{ background: "#C84FFF", opacity: 0.09 }}
        animate={{ x: [0, 30, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 6 }}
      />
      {/* Diagonal gradient swath */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(125deg, oklch(0.68 0.28 308 / 0.06) 0%, transparent 45%, oklch(0.68 0.28 308 / 0.04) 100%)",
        }}
      />
      {/* Dot grid — upper-left quadrant only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, oklch(0.68 0.28 308 / 0.14) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          maskImage: "linear-gradient(135deg, black 0%, transparent 52%)",
          WebkitMaskImage: "linear-gradient(135deg, black 0%, transparent 52%)",
        }}
      />

      <div className="relative z-10">
        <div className="grid items-center gap-4 md:gap-0 md:grid-cols-[1.7fr_1fr]">
          <HeroImage />
          <div>
        {/* Eyebrow label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="h-px w-8 bg-accent" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
            Centre de Formation Tech
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5"
        >
          <h1 className="font-display text-[2.1rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight text-foreground">
            Formations<br />
            modernes en
          </h1>
          <div className="flex items-baseline gap-0 mt-1 md:mt-2 pb-2 overflow-visible" style={{ minHeight: "1.4em" }}>
            <h1 className="font-display text-[2.1rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.2] tracking-tight text-accent overflow-visible">
              {displayText || "\u00A0"}
            </h1>
            <span
              className="inline-block w-[3px] h-[0.85em] bg-accent ml-1 animate-pulse align-middle self-center overflow-visible"
              aria-hidden="true"
            />
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: startTyping ? 1 : 0, y: startTyping ? 0 : 16 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="text-base md:text-lg text-muted-foreground max-w-[480px] leading-relaxed mb-7"
        >
          Des parcours concrets en Business Intelligence, Data, Web &amp; Cloud
          pour accélérer votre carrière avec des experts du terrain.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: startTyping ? 1 : 0, y: startTyping ? 0 : 16 }}
          transition={{ duration: 0.55, delay: 0.28 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <Button
            asChild
            size="lg"
            className="bg-accent hover:bg-accent/90 text-white cursor-pointer rounded-none px-7 text-sm font-semibold tracking-wide shadow-lg shadow-accent/20"
          >
            <Link href="/formations">
              Découvrir nos formations
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-foreground/20 hover:border-accent hover:text-accent cursor-pointer rounded-none px-7 text-sm font-semibold tracking-wide"
          >
            <Link href="/formations">Nos formations</Link>
          </Button>
        </motion.div>

        {/* Tech badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: startTyping ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap gap-2"
        >
          {techBadges.map((tech, i) => (
            <motion.span
              key={tech}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: startTyping ? 1 : 0, y: startTyping ? 0 : 8 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.07 }}
              className="font-mono text-[11px] px-2.5 py-1 border border-border rounded-sm text-muted-foreground bg-white/60 backdrop-blur-sm"
            >
              {tech}
            </motion.span>
          ))}
        </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
