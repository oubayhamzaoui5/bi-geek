"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const images = ["/i1.webp", "/i2.webp", "/i3.webp", "/i4.webp", "/i5.webp", "/i6.webp"]

export default function GetCertified() {
  return (
    <section className="py-20 border-y border-border -mx-4 md:-mx-16 px-4 md:px-16" style={{ backgroundColor: "oklch(0.965 0.004 80)" }}>
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12"
        >
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
              Certifications
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Certifiez vos{" "}
            <span className="text-accent">compétences</span>
          </h2>
        </motion.div>

        {/* Certs grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-10 items-center justify-items-center">
          {images.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 hover:scale-105 transition-transform duration-300"
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
      </div>
    </section>
  )
}
