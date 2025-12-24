"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { BiHeroVisual } from "@/components/bi-hero-visual"

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const heroItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
}

export function AboutHero() {
  const featuresRef = useRef<HTMLDivElement>(null)
  const [counts, setCounts] = useState({ apprenants: 0, formations: 0, formateurs: 0 })

  const description = `Chez BI GEEK, nous accélérons les carrières en data, BI et développement web grâce à des experts du terrain et des projets réels. Notre approche unique combine apprentissage pratique, mentorat personnalisé et mise en situation professionnelle. Chaque apprenant repart avec des compétences opérationnelles, prêt à relever les défis du marché, à innover et à progresser rapidement dans sa carrière.`

  const featureTargets = { apprenants: 500, formations: 200, formateurs: 50 }

  useEffect(() => {
    if (featuresRef.current) {
      const featureObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((featureEntry) => {
            if (featureEntry.isIntersecting) {
              const interval = setInterval(() => {
                setCounts((prev) => {
                  const newCounts: typeof counts = { ...prev }
                  let done = true
                  Object.keys(featureTargets).forEach((key) => {
                    const k = key as keyof typeof counts
                    if (prev[k] < featureTargets[k]) {
                      newCounts[k] = Math.min(prev[k] + Math.ceil(featureTargets[k] / 50), featureTargets[k])
                      done = false
                    }
                  })
                  if (done) clearInterval(interval)
                  return newCounts
                })
              }, 10)
              featureObserver.disconnect()
            }
          })
        },
        { threshold: 0.5 }
      )
      featureObserver.observe(featuresRef.current)
    }
  }, [])



  return (
    <section className="relative mt-12 overflow-hidden -mx-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#C84FFF] to-[#8A2BE2] -mx-16 py-12 md:py-24">
        <div className="container mx-auto px-8 sm:px-8">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center"
            variants={heroContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {/* Left Column */}
            <motion.div className="space-y-6" variants={heroItemVariants}>
              <p className="text-base sm:text-xl md:text-2xl lg:text-2xl font-extrabold text-white leading-snug text-left">
                {description}
              </p>
            </motion.div>

            {/* Right Column */}
            <motion.div
              className="relative h-80 md:h-96 flex items-center justify-center -mx-20"
              variants={heroItemVariants}
            >
              <BiHeroVisual />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-[#F8EDFF] py-4" ref={featuresRef}>
        <div className="container mx-auto px-8 sm:px-8 flex flex-col sm:flex-row justify-around text-center gap-6">
          {["apprenants", "formations", "formateurs"].map((feature, i) => (
            <motion.div
              key={feature}
              className="p-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
            >
              <span className="text-3xl font-bold text-[#C84FFF]">
                +{counts[feature as keyof typeof counts]}
              </span>
              <p className="text-sm text-gray-600 mt-1 capitalize">{feature}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
