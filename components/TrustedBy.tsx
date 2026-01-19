"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const images = [
  "/p1.webp", "/p2.webp",
  "/p3.webp", "/p4.webp", "/p5.webp",
  "/p6.webp", "/p7.webp", "/p8.webp",
  "/p9.webp", "/p10.webp",
]

// Grid structure per row
const rows = [
  images.slice(0, 2),
  images.slice(2, 5),
  images.slice(5, 8),
  images.slice(8, 10),
]

export default function TrustedBy() {
  let index = 0

  return (
    <section className="w-full py-20 md:py-8">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-lg font-semibold uppercase tracking-widest text-center mb-8"
      >
        Des institutions qui nous font <span className="text-accent"> confiance </span>
      </motion.h2>

      {/* Grid */}
      <div className="flex flex-col gap-0 items-center">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-8 flex-wrap justify-center sm:gap-6"
          >
            {row.map((src) => {
              index++
              return (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: "easeOut",
                  }}
                  className="relative w-20 h-20 sm:w-1/2 sm:h-28 md:w-35 md:h-35"
                >
                  <Image
                    src={src}
                    alt="Partenaire"
                    fill
                    className="object-contain"
                  />
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
