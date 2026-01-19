"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: {},
  visible: {},
}

const imageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
}

const textVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: "easeOut", delay: 0.3 },
  },
}

export function AboutHero() {
  return (
    <div id="about">
      <section className="relative overflow-hidden mt-24">
        <motion.div
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          {/* Left: Image */}
          <motion.div
            className="flex justify-center md:justify-start"
            variants={imageVariants}
          >
            <div className="w-64 h-64 md:w-80 md:h-80 lg:w-[800px] lg:h-[800px] relative">
              <Image
                src="/person2.webp"
                alt="Girl thinking"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div
            className="text-center md:text-left space-y-4 px-6 md:pl-24 md:pt-6"
            variants={textVariants}
          >
            <span className="inline-block text-lg font-semibold uppercase tracking-widest">
              Qui sommes nous ?
            </span>

            <p className="text-sm sm:text-base md:text-[19px] leading-snug max-w-md text-gray-700 mx-auto md:mx-0">
              Chez <span className="text-accent font-semibold">BI GEEK</span>, nous accélérons les carrières en data, BI et développement web grâce à des experts du terrain et des projets réels. Notre approche combine apprentissage pratique, mentorat personnalisé et immersion professionnelle afin de former des profils immédiatement opérationnels.
            </p>

            <div className="flex flex-wrap gap-12 justify-center md:justify-start -mt-2">
              <div className="text-md font-medium text-[#C84FFF]">+500 Apprenants</div>
              <div className="text-md font-medium text-[#C84FFF]">+200 Cours</div>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
