"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BiHeroVisual } from "@/components/bi-hero-visual"
import { ArrowRight, TrendingUp } from "lucide-react"

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
  return (
    <section className="relative py-10 md:py-20 overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center"
          variants={heroContainerVariants}
          initial="hidden"
          whileInView="visible"          // 👈 animate when scrolled into view
          viewport={{ once: true, amount: 0.3 }} // animate once when ~30% is visible
        >
          {/* Left Column */}
          <motion.div className="space-y-6" variants={heroItemVariants}>
            <Badge className="w-fit bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
              À propos
            </Badge>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-balance">
                À propos de <span className="text-accent">BI GEEK</span>
              </h1>
            </div>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed text-pretty">
              Nous accélèrons les carrières en data, BI et développement web. Chez BI GEEK, vous apprenez avec des
              experts du terrain et des projets réels. Notre mission : vous transformer en professionnel opérationnel
              rapidement.
            </p>
<div className="flex flex-col sm:flex-row gap-3">
  {/* Primary: bootcamps */}
  <Button
    asChild
    className="bg-accent hover:bg-[#7d3d9f] text-white gap-2"
  >
    <Link href="/bootcamps">
      Découvrir nos bootcamps
      <ArrowRight className="w-4 h-4" />
    </Link>
  </Button>

  {/* Secondary: formations (inverted) */}
  <Button
    asChild
    variant="outline"
    className="bg-white/80 text-accent border border-accent hover:bg-accent hover:text-white"
  >
    <Link href="/formations">
      Découvrir nos formations
    </Link>
  </Button>
</div>


            <div className="pt-4">
              <Badge variant="secondary" className="gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                +200 apprenants formés
              </Badge>
            </div>
          </motion.div>

          {/* Right Column - BI / Code visual */}
          <motion.div
            className="relative h-80 md:h-96 flex items-center justify-center -mx-20"
            variants={heroItemVariants}
          >
            <BiHeroVisual />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
