"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const images = [
  "/p1.webp", "/p2.webp", "/p3.webp", "/p4.webp", "/p5.webp",
  "/p6.webp", "/p7.webp", "/p8.webp", "/p9.webp", "/p10.webp",
]

export default function TrustedBy() {
  const doubled = [...images, ...images]

  return (
    <section className="py-14 border-y border-border overflow-hidden -mx-4 md:-mx-16 px-4 md:px-16" style={{ backgroundColor: "oklch(0.965 0.004 80)" }}>
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center gap-4 mb-10"
      >
        <div className="h-px flex-1 max-w-[80px] bg-border" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Institutions partenaires
        </span>
        <div className="h-px flex-1 max-w-[80px] bg-border" />
      </motion.div>

      {/* Infinite marquee */}
      <div
        className="relative"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      >
        <div className="flex gap-12 animate-marquee whitespace-nowrap items-center">
          {doubled.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative w-24 h-14 shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
            >
              <Image
                src={src}
                alt="Partenaire"
                fill
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
