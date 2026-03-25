"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const images = [
  "/i1.webp",
  "/i2.webp",
  "/i3.webp",
  "/i4.webp",
  "/i5.webp",
  "/i6.webp",
]

export default function GetCertified() {
  return (
    <section className="w-full py-6 md:py-8">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-lg font-semibold uppercase tracking-widest text-center mb-8"
      >
        Certifiez vos <span className="text-accent"> compétences </span>
      </motion.h2>

      {/* Grid */}
      <div
        className="
        -mx-2
        md:mx-0
          grid
          grid-cols-3      /* 2 columns on mobile → 2 rows for 6 images */
          gap-1             /* small gap on mobile */
          md:grid-cols-6    /* 1 row on desktop */
          md:gap-12         /* bigger gap on desktop */
          justify-items-center
          items-center
        "
      >
        {images.map((src, index) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              delay: index * 0.08,
              ease: "easeOut" as const,
            }}
            className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36"
          >
            <Image
              src={src}
              alt="Certification"
              fill
              className="object-contain"
            />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
