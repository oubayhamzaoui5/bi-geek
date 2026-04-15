"use client"

import { motion } from "framer-motion"

const steps = [
  {
    num: "01",
    title: "Choisissez votre programme",
    desc: "Parcourez formations et bootcamps, filtrez par domaine ou niveau. Trouvez le parcours qui correspond à votre objectif.",
  },
  {
    num: "02",
    title: "Apprenez avec des experts",
    desc: "Sessions live avec des professionnels en activité. Posez des questions, échangez, apprenez de vraies expériences terrain.",
  },
  {
    num: "03",
    title: "Pratiquez sur des cas réels",
    desc: "Chaque programme intègre des projets concrets issus de contextes professionnels. Construisez un portfolio solide.",
  },
  {
    num: "04",
    title: "Certifiez & progressez",
    desc: "Obtenez votre certification BI GEEK et accédez au réseau de nos partenaires recruteurs pour accélérer votre carrière.",
  },
]

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28 border-y border-border -mx-4 md:-mx-16 px-4 md:px-16" style={{ backgroundColor: "oklch(0.965 0.004 80)" }}>
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-14">
          <div className="h-px w-8 bg-accent" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
            Comment ça marche
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — big headline */}
          <div className="md:sticky md:top-24">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight"
            >
              De zéro à<br />
              opérationnel<br />
              <span className="text-accent">en 4 étapes.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-5 text-muted-foreground text-base leading-relaxed max-w-sm"
            >
              Un processus clair, structuré et éprouvé par +500 apprenants qui ont transformé leur carrière.
            </motion.p>
          </div>

          {/* Right — steps */}
          <div className="space-y-0">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="group flex gap-8 py-7 border-b border-border last:border-0 hover:bg-white/50 transition-colors duration-300 px-4 -mx-4"
              >
                {/* Number */}
                <div className="shrink-0 font-display text-6xl font-black text-accent/[0.15] group-hover:text-accent/30 transition-colors duration-500 leading-none w-16 text-right tabular-nums">
                  {step.num}
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-display font-bold text-base md:text-lg text-foreground mb-1.5 group-hover:text-accent transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
