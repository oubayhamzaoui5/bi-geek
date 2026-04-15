"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

const highlights = [
  "Programmes conçus autour de vos enjeux métiers réels",
  "Formateurs experts en activité professionnelle",
  "Suivi des progressions et certification collective",
]

export default function EnterpriseTeaser() {
  return (
    <section
      className="py-20 md:py-28 border-y border-border -mx-4 md:-mx-16 px-4 md:px-16"
      style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — content */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="space-y-7"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                  BI Geek Entreprises
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Investissez dans<br />
                <span className="text-accent">l'excellence de vos équipes.</span>
              </h2>
            </div>

            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              Nous concevons et délivrons des programmes de formation tech sur mesure
              pour les entreprises qui souhaitent renforcer les compétences de leurs
              collaborateurs et rester à la pointe de l'innovation.
            </p>

            <ul className="space-y-3">
              {highlights.map((h, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-3 text-sm text-foreground/80"
                >
                  <div className="shrink-0 mt-0.5 w-4 h-4 border border-accent flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-accent" />
                  </div>
                  {h}
                </motion.li>
              ))}
            </ul>

            <Link
              href="/entreprises"
              className="group inline-flex items-center gap-2 bg-accent text-white px-6 py-3 text-sm font-semibold hover:bg-accent/90 transition-all"
            >
              Découvrir nos offres entreprises
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </motion.div>

          {/* Right — image */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative flex justify-center md:justify-end"
          >
            <div className="relative w-full max-w-lg">
              <div
                className="absolute top-4 right-4 w-full h-full border-2 border-accent/25 pointer-events-none z-0"
                aria-hidden
              />
              <div className="relative z-10 aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                  src="/enterprise-hero.webp"
                  alt="Formation professionnelle pour entreprises — BI Geek"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
