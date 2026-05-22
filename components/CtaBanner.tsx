"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function CtaBanner() {
  return (
    <section className="-mx-4 md:-mx-16 px-4 md:px-16 py-20 md:py-32 relative overflow-hidden border-t-4 border-accent">

      {/* Ghost stat — decorative right side */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute right-0 top-1/2 -translate-y-1/2 font-display font-black leading-none text-accent"
        style={{ fontSize: "clamp(8rem, 22vw, 22rem)", opacity: 0.05 }}
      >
        +500
      </div>

      {/* Subtle orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-[0.07]"
        style={{ background: "#C84FFF" }}
      />

      <div className="relative z-10 max-w-5xl">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="h-px w-8 bg-accent" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
            Commencez maintenant
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="font-display font-black text-foreground leading-[0.95] tracking-tight mb-14"
          style={{ fontSize: "clamp(2.8rem, 7vw, 6rem)" }}
        >
          Prêt à transformer<br />
          <span className="text-accent whitespace-nowrap">votre carrière&nbsp;?</span>
        </motion.h2>

        {/* Bottom row — description + buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-sm">
            Rejoignez +500 apprenants qui ont choisi BI GEEK pour maîtriser
            les technologies qui recrutent.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/formations"
              className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-8 py-4 text-sm font-semibold hover:bg-accent/90 transition-all"
            >
              Voir les bootcamps
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <Link
              href="/formations"
              className="inline-flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-8 py-4 text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
            >
              Parcourir les formations
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
