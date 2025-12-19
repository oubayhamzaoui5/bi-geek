"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { programs, type Program } from "@/data/programs"
import { ProgramCard } from "./program-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const categories: Array<"All" | Program["category"]> = ["All", "BI", "Data", "Web", "Cloud", "AI/ML"]

export function ProgramsGrid() {
  const [selectedCategory, setSelectedCategory] = useState<"All" | Program["category"]>("All")
  const [animKey, setAnimKey] = useState(0)         // force re-animation on filter change
  const [started, setStarted] = useState(false)     // start animation once the section is in view

  const filteredPrograms =
    selectedCategory === "All" ? programs : programs.filter((p) => p.category === selectedCategory)

  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.3, margin: "-80px" })

  useEffect(() => {
    if (inView) setStarted(true)
  }, [inView])

  // Title: reveal early (bottom -> top)
  const titleVariants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  }

  // Category buttons: soft fade/scale in with stagger
  const filterItemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.35, ease: "easeOut", delay: 0.15 + i * 0.06 },
    }),
  }

  // Grid parent controls stagger for ALL cards
  const gridVariants = {
    hidden: { opacity: 1 }, // keep grid visible; children will animate
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.25,
      },
    },
  }

  // Card child animation (all at once when parent goes "show")
  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  }

  const handleCategoryClick = (category: "All" | Program["category"]) => {
    setSelectedCategory(category)
    // bump key to remount the grid and re-run the entrance animation
    setAnimKey((k) => k + 1)
  }

  return (
    <section  className="py-18">
      <div ref={sectionRef} className="container mx-auto px-4">
        <div className="text-center mb-8">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-accent mb-4"
            variants={titleVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            Nos formations
          </motion.h2>

              <motion.p
            className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty"
            initial={{ opacity: 0, y: 14 }}
            animate={started ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
          >
            Des formations complètes et pratiques pour développer vos compétences.
          </motion.p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {categories.map((category, i) => (
            <motion.div
              key={category}
              custom={i}
              variants={filterItemVariants}
              initial="hidden"
              animate={started ? "show" : "hidden"}
            >
              <Button
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryClick(category)}
                className={selectedCategory === category ? "bg-accent hover:bg-[#7d3d9f] cursor-pointer" : "cursor-pointer"}
              >
                {category === "All" ? "Tous" : category}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Programs grid — all cards animate together when first triggered.
            Remount grid on filter change using animKey. */}
        <motion.div
          key={animKey}                         // forces re-animation on each filter
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={gridVariants}
          initial="hidden"
          animate={started ? "show" : "hidden"} // single trigger for all cards
        >
          {filteredPrograms.map((program) => (
            <motion.div key={program.id} variants={cardVariants}>
              <ProgramCard program={program} />
            </motion.div>
          ))}
        </motion.div>
{/* Global CTA */}
<div className="mt-10 text-center">
  <Button
    asChild
    size="lg"
    className="bg-accent hover:bg-[#7d3d9f] text-white cursor-pointer"
  >
    <Link href="/formations">
      Voir toutes les formations
    </Link>
  </Button>
</div>

      </div>
    </section>
  )
}
