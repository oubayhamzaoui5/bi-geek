"use client"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import TopPrograms from "@/components/TopPrograms"
import { motion } from "framer-motion"
import TrustedBy from "@/components/TrustedBy"
import { Testimonials } from "@/components/testimonials"
import { Contact } from "@/components/contact"
import { Faq } from "@/components/faq"
import { Footer } from "@/components/footer"
import { AboutHero } from "@/components/about-hero"
import { MainCategories } from "@/components/main-categories"
import GetCertified from "@/components/GetCertified"
import WhyBiGeek from "@/components/WhyBiGeek"
import HowItWorks from "@/components/HowItWorks"
import CtaBanner from "@/components/CtaBanner"
import EnterpriseTeaser from "@/components/EnterpriseTeaser"

const sampleCategories = [
  {
    id: "data",
    title: "Data Analytics",
    imageUrl: "/catdata.webp",
    description: "Analysez les données, créez des visualisations et maîtrisez SQL pour prendre des décisions basées sur les données.",
    link: "/",
  },
  {
    id: "ai",
    title: "AI",
    imageUrl: "/catai.webp",
    description: "Découvrez l'intelligence artificielle, le machine learning, le deep learning et leurs applications concrètes.",
    link: "/",
  },
  {
    id: "cloud",
    title: "Cloud",
    imageUrl: "/catcloud.webp",
    description: "Apprenez à déployer, gérer et sécuriser des applications sur des plateformes cloud modernes.",
    link: "/",
  },
  {
    id: "cs",
    title: "Cyber Security",
    imageUrl: "/catcs.webp",
    description: "Protégez les systèmes, réseaux et données contre les cyberattaques et menaces numériques.",
    link: "/",
  },
  {
    id: "wd",
    title: "Web Development",
    imageUrl: "/catweb.webp",
    description: "Développez des sites et applications web modernes en frontend, backend et full-stack.",
    link: "/",
  },
  {
    id: "pm",
    title: "Project Management",
    imageUrl: "/catmanagment.webp",
    description: "Planifiez, gérez et pilotez des projets efficacement avec des méthodes agiles et classiques.",
    link: "/",
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 md:px-16">

        {/* 1 — Hero */}
        <Hero />

        {/* 2 — Social proof strip */}
        <TrustedBy />

        {/* 3 — Who we are + stats */}
        <AboutHero />

        {/* 4 — Enterprise offer */}
        <EnterpriseTeaser />

        {/* 5 — Top programs */}
        <TopPrograms />

             {/* 4 — Why BI Geek (value props) */}
        <WhyBiGeek />



        {/* 8 — Domains */}
        <section className="w-full pt-16 md:pt-24 pb-2">
          <div className="mx-auto px-2 sm:px-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                Domaines
              </span>
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6 }}
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight"
            >
              Explorez nos<br />
              <span className="text-accent">domaines d'expertise</span>
            </motion.h2>
          </div>
        </section>
        <MainCategories categories={sampleCategories} />

      
        {/* 6 — How it works */}
        <HowItWorks />

        {/* 7 — Certifications */}
        <GetCertified />

   

        {/* 12 — Contact */}
        <Contact />

          

        {/* 13 — FAQ */}
        <Faq />
          {/* 9 — Testimonials */}
        <Testimonials />
   {/* 11 — CTA banner */}
        <CtaBanner />
      </main>
      <Footer />
    </div>
  )
}
