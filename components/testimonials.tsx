"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { testimonials } from "@/data/testimonials"
import { Card, CardContent } from "@/components/ui/card"
import { Quote } from "lucide-react"

const ROTATE_MS = 8000 // 8s per testimonial

export function Testimonials() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const prefersReducedMotion = useReducedMotion()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-rotate
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setDirection(1)
      setIndex((i) => (i + 1) % testimonials.length)
    }, ROTATE_MS)

    return () => timeoutRef.current && clearTimeout(timeoutRef.current)
  }, [index])

  // Animation variants
  const variants = {
    enter: (dir: 1 | -1) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : { opacity: 0, x: dir > 0 ? 24 : -24, filter: "blur(6px)" },
    center: prefersReducedMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          transition: { duration: 0.45, ease: "easeOut" },
        },
    exit: (dir: 1 | -1) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : {
            opacity: 0,
            x: dir > 0 ? -24 : 24,
            filter: "blur(6px)",
            transition: { duration: 0.35, ease: "easeIn" },
          },
  }

  const t = testimonials[index]

  return (
    <section
      id="temoignages"
      className="relative flex items-center justify-center bg-accent text-white py-12 md:py-32  -mx-4 md:mx-0"
    >
      <div className="container mx-auto px-2 md:px-4">
        <div className="mx-auto max-w-xl md:max-w-3xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={t.id ?? index}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {/* Consistent height for all cards (mobile + desktop) */}
              <Card
                className="
                  bg-white text-foreground rounded-xl overflow-hidden 
                  h-[300px] sm:h-[320px] md:h-[340px]
                  flex
                "
              >
                <CardContent
                  className="
                    flex flex-col justify-between w-full
                    pt-6 pb-8 px-4
                    sm:px-6 sm:pt-8 sm:pb-10
                  "
                >
                  <div>
                    <Quote className="h-7 w-7 sm:h-9 sm:w-9 text-accent mb-4" />

                    {/* Smaller text on mobile */}
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                      “{t.quote}”
                    </p>

                    <div>
                      <p className="font-bold text-foreground text-sm sm:text-base">
                        {t.author}
                      </p>

                      {(t.role || t.company) && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {t.role}
                          {t.role && t.company ? " • " : ""}
                          {t.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-muted/40">
                    <motion.div
                      key={`progress-${index}`}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{
                        duration: prefersReducedMotion ? 0.2 : ROTATE_MS / 1000,
                        ease: "linear",
                      }}
                      className="h-full bg-accent"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
