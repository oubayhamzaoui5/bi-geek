"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { testimonials } from "@/data/testimonials"
import Image from "next/image"
import { Star } from "lucide-react"

const ROTATE_MS = 8000

export function Testimonials() {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % testimonials.length)
    }, ROTATE_MS)

    return () => timeoutRef.current && clearTimeout(timeoutRef.current)
  }, [index])

  const variants = {
    enter: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 24 },
    center: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut" },
    },
    exit: prefersReducedMotion
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: -24,
          transition: { duration: 0.3, ease: "easeIn" },
        },
  }

  const t = testimonials[index]

  return (
    <section id="temoignages" className="py-16 md:py-28">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* LEFT — Fixed-height wrapper (prevents scroll jump) */}
          <div className="flex justify-center">
            <div
              className="
                relative
                w-full max-w-md
                min-h-[360px] md:min-h-[400px]
                overflow-hidden
                flex items-center justify-center
              "
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={t.id}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  layout={false}
                  className="flex flex-col items-center text-center absolute inset-0"
                >
                  {/* Avatar */}
                  <div className="mb-1">
                    <Image
                      src={t.avatar ?? "/sketch-face.webp"}
                      alt={t.author}
                      width={170}
                      height={170}
                      className="rounded-full"
                    />
                  </div>

                  {/* Name */}
                  <p className="font-semibold text-lg mb-1">{t.author}</p>

                  {/* Stars */}
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < t.rating
                            ? "fill-[#C34AFF] text-[#C34AFF]"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="px-6">
                    <p className="text-xs md:text-base text-muted-foreground leading-relaxed">
                      “{t.quote}”
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT — Static image with subtle on-scroll animation */}
          <div className="hidden md:flex justify-center">
            <motion.div
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, scale: 0.92, rotate: 4 }
              }
              whileInView={{
                opacity: 1,
                scale: 1,
                rotate: 0,
              }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.4,
                ease: "easeIn",
                delay: 0.25, // 👈 little late
              }}
            >
              <Image
                src="/person3.webp"
                alt="Happy student"
                width={800}
                height={800}
                className="object-contain"
                priority
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
