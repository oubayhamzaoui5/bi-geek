"use client"

import { motion } from "framer-motion"
import { Users, Briefcase, Award, MessageCircle } from "lucide-react"

const pillars = [
  {
    num: "01",
    icon: Users,
    title: "Experts du terrain",
    desc: "Nos formateurs exercent en entreprise. Pas de théorie creuse — chaque session est ancrée dans des situations professionnelles réelles.",
  },
  {
    num: "02",
    icon: Briefcase,
    title: "Projets concrets",
    desc: "Vous construisez un portfolio de projets professionnels présentables dès le premier jour. Apprenez en faisant.",
  },
  {
    num: "03",
    icon: Award,
    title: "Certifié & reconnu",
    desc: "Certification BI GEEK à chaque fin de parcours. Préparation aux certifications officielles Microsoft, AWS et autres.",
  },
  {
    num: "04",
    icon: MessageCircle,
    title: "Mentorat continu",
    desc: "Accès à votre mentor pendant et après la formation. Retours personnalisés et suivi jusqu'à votre prochain poste.",
  },
]

export default function WhyBiGeek() {
  return (
    <section className="w-full py-20 md:py-28 border-b border-border">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                Pourquoi BI Geek
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Ce qui nous<br />
              <span className="text-accent">différencie</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs md:text-right leading-relaxed">
            Une formation pensée pour votre carrière,<br className="hidden md:block" />
            pas pour la salle de classe.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-border">
          {pillars.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.09 }}
                className="group relative overflow-hidden p-7 border-r border-b border-border last:border-r-0 sm:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r lg:[&:nth-child(4)]:border-r-0 transition-colors duration-300"
              >
                {/* Gradient hover wash */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: "linear-gradient(135deg, transparent 40%, oklch(0.68 0.28 308 / 0.07) 100%)" }}
                />
                {/* Giant decorative number */}
                <div
                  aria-hidden
                  className="absolute -bottom-4 -right-1 font-display text-[8rem] font-black leading-none select-none pointer-events-none text-foreground/[0.04] group-hover:text-accent/[0.09] transition-colors duration-500"
                >
                  {p.num}
                </div>

                {/* Number + icon row */}
                <div className="relative flex items-center justify-between mb-6">
                  <span className="font-mono text-xs text-muted-foreground/50">{p.num}</span>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="w-9 h-9 border border-border flex items-center justify-center group-hover:border-accent group-hover:text-accent group-hover:bg-accent/5 transition-colors duration-300"
                  >
                    <Icon size={16} />
                  </motion.div>
                </div>

                <h3 className="relative font-display font-bold text-base text-foreground mb-2 group-hover:text-accent transition-colors duration-300">
                  {p.title}
                </h3>
                <p className="relative text-sm text-muted-foreground leading-relaxed">
                  {p.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
