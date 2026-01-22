"use client"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import TopPrograms from "@/components/TopPrograms"
import { motion } from "framer-motion"
import TrustedBy from "@/components/TrustedBy"
import { Testimonials } from "@/components/testimonials"
import {Contact} from "@/components/contact"
import { Faq } from "@/components/faq"
import { Footer } from "@/components/footer"
import { AboutHero } from "@/components/about-hero"
import { MainCategories } from "@/components/main-categories"
import GetCertified from "@/components/GetCertified"

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
    description: "Découvrez l’intelligence artificielle, le machine learning, le deep learning et leurs applications concrètes.",
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
    title: "Project Managment",
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
        <Hero />
                <AboutHero />
                        <TrustedBy />

                        <TopPrograms />
                              <GetCertified />

                  {/* Header Section */}

{/* Header Section */}
<section className="w-full pt-2 md:pt-16">
  <div className="mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7 }}
      className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance mb-2"
    >
      Explorez nos
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C84FFF] to-[#C84FFF]/70 block mt-2">
        Domaines d’expertise
      </span>
    </motion.h1>

    <motion.p
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed"
    >
      Choisissez parmi notre large gamme de parcours d’apprentissage conçus pour vous aider à maîtriser les technologies modernes et rester en avance dans votre carrière.
    </motion.p>
  </div>
</section>



      {/* Categories Grid */}
      <MainCategories categories={sampleCategories} />



        <Testimonials />
        <Contact />

        <Faq />
      </main>
      <Footer />
    </div>
  )
}
