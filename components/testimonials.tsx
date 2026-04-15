"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { testimonials } from "@/data/testimonials"
import Image from "next/image"
import { Star } from "lucide-react"

const ROTATE_MS = 8000

export function Testimonials() {
  const [index, setIndex]               = useState(0)
  const prefersReducedMotion            = useReducedMotion()
  const timeoutRef                      = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIndex((i) => (i + 1) % testimonials.length), ROTATE_MS)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [index])

  const t = testimonials[index]

  const variants = {
    enter:  prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
    center: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
    exit:   prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, transition: { duration: 0.3, ease: "easeIn" as const } },
  }

  return (
    <section id="temoignages" className="py-20 md:py-28 border-y border-border -mx-4 md:-mx-16 px-4 md:px-16" style={{ backgroundColor: "oklch(0.965 0.004 80)" }}>
      <div className="container mx-auto px-4 md:px-6">

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-12 lg:gap-20 items-start">

          {/* LEFT — label + navigation */}
          <div className="flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-6 md:pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                Témoignages
              </span>
            </div>
            {/* Dot navigation */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Témoignage ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-accent" : "w-1.5 bg-border hover:bg-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — quote */}
          <div className="relative">
            {/* Giant decorative quote */}
            <div
              className="absolute -top-6 -left-2 font-display text-[10rem] leading-none text-accent/10 select-none pointer-events-none"
              aria-hidden
            >
              ❝
            </div>

            <div className="relative min-h-[240px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={t.id}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0 flex flex-col justify-between"
                >
                  {/* Quote text */}
                  <p className="text-xl md:text-2xl lg:text-3xl text-foreground leading-relaxed font-medium mb-8 pt-8">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4 border-t border-border pt-5">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-accent/20">
                      <Image
                        src={t.avatar ?? "/sketch-face.webp"}
                        alt={t.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm text-foreground">{t.author}</p>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < t.rating ? "fill-accent text-accent" : "text-border"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
