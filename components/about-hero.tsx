"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

const stats = [
  { value: "+500", label: "Apprenants formés" },
  { value: "+200", label: "Cours disponibles" },
]

export function AboutHero() {
  return (
    <div id="about">
      <section className="relative overflow-hidden py-20 md:py-28">
        {/* Section label */}
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="h-px w-8 bg-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
              Qui sommes-nous
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — image with decorative frame */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="relative flex justify-center md:justify-start"
            >
              {/* Offset decorative border */}
              <div
                className="absolute top-4 left-4 w-full h-full border-2 border-accent/25 rounded-none pointer-events-none z-0"
                style={{ maxWidth: 420 }}
                aria-hidden
              />
              <div className="relative z-10 w-[300px] md:w-[360px] lg:w-[420px] aspect-square">
                <Image
                  src="/person2.webp"
                  alt="Formation BI Geek"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </motion.div>

            {/* Right — text + stats */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-8"
            >
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground">
                Nous accélérons<br />
                les carrières{" "}
                <span className="text-accent">tech.</span>
              </h2>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                Chez <span className="text-foreground font-semibold">BI GEEK</span>, nous formons des profils
                immédiatement opérationnels grâce à des experts du terrain,
                des projets réels et un mentorat personnalisé.
              </p>

              {/* Stats row */}
              <div className="flex gap-10">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                    className="space-y-1"
                  >
                    <div className="font-display text-4xl md:text-5xl font-bold text-accent leading-none">
                      {s.value}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                      {s.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Learn more */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.55 }}
              >
                <Link
                  href="/a-propos"
                  className="group inline-flex items-center gap-2 border border-accent text-accent px-5 py-2.5 text-sm font-semibold hover:bg-accent hover:text-white transition-all"
                >
                  En savoir plus
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
