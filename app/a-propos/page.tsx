"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Users, Briefcase, Award, MessageCircle, Lightbulb, Target } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

// ─── Data ────────────────────────────────────────────────────────────────────

const stats = [
  { value: "+500", label: "Apprenants formés" },
  { value: "+200", label: "Cours & bootcamps" },
  { value: "6",    label: "Domaines tech" },
  { value: "95%",  label: "Taux de satisfaction" },
  { value: "+50",  label: "Formateurs experts" },
]

const milestones = [
  { year: "2020", title: "Création de BI Geek", desc: "Naissance du projet à Tunis, avec une vision claire : une formation tech ancrée dans la réalité professionnelle." },
  { year: "2021", title: "Premiers bootcamps", desc: "Lancement de nos premiers programmes intensifs en Business Intelligence et Data Analytics." },
  { year: "2022", title: "Expansion des domaines", desc: "Ouverture des filières Cloud, Cyber Security et Développement Web pour répondre aux besoins du marché." },
  { year: "2023", title: "+300 apprenants certifiés", desc: "Un cap symbolique franchi, avec des diplômés placés dans les meilleures entreprises tech tunisiennes." },
  { year: "2024", title: "Partenariats stratégiques", desc: "Signature d'accords avec des entreprises partenaires pour faciliter l'insertion professionnelle de nos apprenants." },
]

const values = [
  {
    num: "01",
    icon: Target,
    title: "Ancrage terrain",
    desc: "Chaque formateur est un professionnel en activité. Pas de théorie abstraite — chaque cours est construit autour de situations réelles.",
  },
  {
    num: "02",
    icon: Briefcase,
    title: "Apprentissage par le projet",
    desc: "Vous construisez un portfolio dès le premier jour. Nos projets sont conçus pour être montrés en entretien.",
  },
  {
    num: "03",
    icon: Users,
    title: "Accompagnement humain",
    desc: "Un mentor attitré, des retours personnalisés, un suivi qui ne s'arrête pas à la fin de la session.",
  },
  {
    num: "04",
    icon: Award,
    title: "Excellence accessible",
    desc: "La qualité de formation ne doit pas être un luxe. Nous rendons l'expertise tech disponible pour tous.",
  },
  {
    num: "05",
    icon: Lightbulb,
    title: "Innovation pédagogique",
    desc: "Nos programmes évoluent en permanence pour refléter les technologies et pratiques qui recrutent aujourd'hui.",
  },
  {
    num: "06",
    icon: MessageCircle,
    title: "Impact mesurable",
    desc: "Votre réussite professionnelle est notre seule métrique. Nous vous suivons jusqu'à votre prochain poste.",
  },
]

const approach = [
  {
    num: "01",
    title: "Sessions live avec des experts",
    desc: "Cours en direct avec des professionnels en activité. Posez vos questions en temps réel, échangez sur de vraies situations terrain.",
  },
  {
    num: "02",
    title: "Projets professionnels réels",
    desc: "Chaque programme intègre des cas concrets issus de l'industrie. À la fin, vous avez un portfolio que vous pouvez montrer.",
  },
  {
    num: "03",
    title: "Certification BI Geek",
    desc: "Une certification reconnue par nos partenaires recruteurs, plus une préparation aux certifications officielles (Microsoft, AWS, etc.).",
  },
  {
    num: "04",
    title: "Mentorat continu",
    desc: "Votre mentor vous suit pendant et après la formation. Retours personnalisés, guidance de carrière, réseau professionnel.",
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px w-8 bg-accent" />
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
        {children}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="px-4 md:px-16">

        {/* ── 1. Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-28 -mx-4 md:-mx-16 px-4 md:px-16 border-b border-border">

          {/* Right — image bleeding from the edge */}
          <div
            className="hidden md:block absolute right-0 top-0 bottom-0 w-[44%] bg-muted"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, black 18%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 18%)",
            }}
          >
            <Image
              src="/about-story.webp"
              alt="BI Geek — salle de formation tech"
              fill
              priority
              className="object-cover"
            />
            {/* Subtle purple tint overlay */}
            <div
              className="absolute inset-0"
              style={{ background: "oklch(0.68 0.28 308 / 0.06)" }}
              aria-hidden
            />
          </div>

          {/* Left ambient orb */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.13]"
            style={{ background: "#C84FFF" }}
          />

          {/* Left — content */}
          <div className="relative z-10 md:max-w-[54%]">

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <SectionLabel>À propos de BI Geek</SectionLabel>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="font-display font-bold text-foreground leading-tight tracking-tight mt-4 mb-6"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)" }}
            >
              Le centre tech qui accélère<br />
              les carrières{" "}
              <span className="text-accent">en Tunisie.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22 }}
              className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-md"
            >
              Fondé en 2020, BI GEEK forme des professionnels tech immédiatement
              opérationnels grâce à des formateurs en activité, des projets réels
              et un accompagnement qui ne s'arrête pas à la fin de la session.
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.34 }}
              className="flex flex-wrap gap-0 border border-border w-fit"
            >
              {[
                { value: "+500", label: "Apprenants" },
                { value: "+200", label: "Formations" },
                { value: "6",    label: "Domaines" },
                { value: "2020", label: "Fondé en" },
              ].map((s, i) => (
                <div key={s.label} className="px-6 py-4 border-r border-border last:border-r-0 text-center">
                  <div className="font-display text-2xl font-black text-accent leading-none">{s.value}</div>
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>

          </div>
        </section>

        {/* ── 2. Mission ──────────────────────────────────────────────── */}
        <section
          className="py-20 md:py-28 border-y border-border -mx-4 md:-mx-16 px-4 md:px-16"
          style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7 }}
              className="max-w-4xl"
            >
              <SectionLabel>Notre mission</SectionLabel>
              <blockquote className="font-display font-bold text-2xl md:text-3xl lg:text-4xl text-foreground leading-tight mt-6">
                "Rendre l'expertise tech{" "}
                <span className="text-accent">accessible, concrète</span>{" "}
                et immédiatement utile pour chaque apprenant."
              </blockquote>
              <p className="mt-8 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Nous croyons que la meilleure formation est celle qui répond à une réalité
                professionnelle immédiate. Chez BI GEEK, chaque cours, chaque projet, chaque
                interaction avec un mentor est conçu pour que vous soyez opérationnel dès
                votre première journée en entreprise.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── 3. Notre histoire ───────────────────────────────────────── */}
        <section className="py-20 md:py-28 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

              {/* Left — timeline */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6 }}
              >
                <SectionLabel>Notre histoire</SectionLabel>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-10">
                  Né d'un constat,<br />
                  <span className="text-accent">construit pour durer.</span>
                </h2>

                <div className="space-y-0">
                  {milestones.map((m, i) => (
                    <motion.div
                      key={m.year}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.45, delay: i * 0.08 }}
                      className="group flex gap-6 py-5 border-b border-border last:border-0"
                    >
                      <div className="shrink-0 font-display text-4xl font-black text-accent/20 group-hover:text-accent/40 transition-colors duration-300 leading-none w-16 tabular-nums">
                        {m.year}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-foreground mb-1 group-hover:text-accent transition-colors duration-300">
                          {m.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right — image */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="relative flex items-start justify-end md:pt-16"
              >
                <div className="relative w-full max-w-md">
                  <div
                    className="absolute top-4 right-4 w-full h-full border-2 border-accent/25 pointer-events-none z-0"
                    aria-hidden
                  />
                  <div className="relative z-10 aspect-[4/3] w-full overflow-hidden bg-muted">
                    <Image
                      src="/about-story.webp"
                      alt="L'histoire de BI Geek — salle de formation tech"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── 4. Notre approche ───────────────────────────────────────── */}
        <section
          className="py-20 md:py-28 border-b border-border -mx-4 md:-mx-16 px-4 md:px-16"
          style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
              {/* Left sticky */}
              <div className="md:sticky md:top-24">
                <SectionLabel>Notre approche</SectionLabel>
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mt-6"
                >
                  Une méthode qui<br />
                  <span className="text-accent">fait la différence.</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="mt-5 text-muted-foreground text-base leading-relaxed max-w-sm"
                >
                  Éprouvée par +500 apprenants, notre pédagogie combine expertise terrain,
                  pratique intensive et accompagnement humain.
                </motion.p>
              </div>

              {/* Right — steps */}
              <div className="space-y-0">
                {approach.map((step, i) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="group flex gap-8 py-7 border-b border-border last:border-0 hover:bg-white/50 transition-colors duration-300 px-4 -mx-4"
                  >
                    <div className="shrink-0 font-display text-6xl font-black text-accent/[0.15] group-hover:text-accent/30 transition-colors duration-500 leading-none w-16 text-right tabular-nums">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base md:text-lg text-foreground mb-1.5 group-hover:text-accent transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Chiffres clés ────────────────────────────────────────── */}
        <section className="py-20 md:py-28 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <SectionLabel>En chiffres</SectionLabel>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border border-border">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="group p-6 md:p-8 border-r border-b border-border last:border-r-0 md:[&:nth-child(5)]:border-r-0 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r hover:bg-accent/[0.03] transition-colors duration-300 text-center"
                >
                  <div className="font-display text-3xl md:text-4xl font-black text-accent leading-none mb-2 group-hover:scale-105 transition-transform duration-300">
                    {s.value}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Nos valeurs ──────────────────────────────────────────── */}
        <section
          className="py-20 md:py-28 border-b border-border -mx-4 md:-mx-16 px-4 md:px-16"
          style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div>
                <SectionLabel>Nos valeurs</SectionLabel>
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mt-4"
                >
                  Ce en quoi<br />
                  <span className="text-accent">nous croyons.</span>
                </motion.h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs md:text-right leading-relaxed">
                Six principes qui guident chaque décision pédagogique<br className="hidden md:block" />
                que nous prenons chez BI GEEK.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-border">
              {values.map((v, i) => {
                const Icon = v.icon
                return (
                  <motion.div
                    key={v.num}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: i * 0.07 }}
                    className="group relative overflow-hidden p-7 border-r border-b border-border hover:bg-white/60 transition-colors duration-300
                      [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r lg:[&:nth-child(2n)]:border-r
                      lg:[&:nth-child(3n)]:border-r-0"
                  >
                    {/* Gradient hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: "linear-gradient(135deg, transparent 40%, oklch(0.68 0.28 308 / 0.06) 100%)" }}
                    />
                    {/* Giant number */}
                    <div
                      aria-hidden
                      className="absolute -bottom-4 -right-1 font-display text-[7rem] font-black leading-none select-none pointer-events-none text-foreground/[0.04] group-hover:text-accent/[0.08] transition-colors duration-500"
                    >
                      {v.num}
                    </div>

                    <div className="relative flex items-center justify-between mb-6">
                      <span className="font-mono text-xs text-muted-foreground/50">{v.num}</span>
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="w-9 h-9 border border-border flex items-center justify-center group-hover:border-accent group-hover:text-accent group-hover:bg-accent/5 transition-colors duration-300"
                      >
                        <Icon size={16} />
                      </motion.div>
                    </div>
                    <h3 className="relative font-display font-bold text-base text-foreground mb-2 group-hover:text-accent transition-colors duration-300">
                      {v.title}
                    </h3>
                    <p className="relative text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 7. CTA ──────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-t-4 border-accent pt-10"
            >
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
                  Prêt à commencer<br />
                  <span className="text-accent">votre parcours ?</span>
                </h2>
                <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
                  Parcourez nos formations et bootcamps, ou contactez-nous pour être guidé
                  vers le programme qui correspond à vos objectifs.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  href="/bootcamps"
                  className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-7 py-3.5 text-sm font-semibold hover:bg-accent/90 transition-all"
                >
                  Voir les bootcamps
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                <Link
                  href="/#contact"
                  className="inline-flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-7 py-3.5 text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
                >
                  Nous contacter
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
