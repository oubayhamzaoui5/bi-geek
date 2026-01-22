"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  title: string
  imageUrl: string
  description: string
  link: string
}

interface MainCategoriesProps {
  categories: Category[]
}

export function MainCategories({ categories }: MainCategoriesProps) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  }

  return (
    <section className="w-full py-6 md:py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
      <motion.div
        key="categories"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
      >
        {/* 📱 Mobile Carousel */}
        <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              variants={itemVariants}
              className="snap-center min-w-[80%] sm:min-w-[70%]"
            >
              <CategoryCard category={category} />
            </motion.div>
          ))}
        </div>

        {/* 🖥 Desktop Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <motion.div key={category.id} variants={itemVariants}>
              <CategoryCard category={category} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

interface CategoryCardProps {
  category: Category
}

function CategoryCard({ category }: CategoryCardProps) {
  return (
<Link href={`/courses?category=${encodeURIComponent(category.title)}`}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl max-w-sm mx-auto",
          "bg-card/50 backdrop-blur-sm border border-border/40",
          "shadow-sm hover:shadow-lg transition-shadow duration-300"
        )}
      >
        {/* Image Container */}
        <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700">
          <Image
            src={category.imageUrl || "/placeholder.svg"}
            alt={category.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute inset-0 bg-[#C84FFF]/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>

        {/* Content Container */}
        <div className="relative flex flex-col gap-2 p-4">
          <h3 className="font-semibold text-base text-foreground line-clamp-2 group-hover:text-[#C84FFF] transition-colors duration-300">
            {category.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {category.description}
          </p>

          <div className="mt-auto flex items-center gap-2 pt-2">
            <div
              className="h-1.5 w-1.5 rounded-full bg-[#C84FFF] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-[#C84FFF] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              Explore
            </span>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            "pointer-events-none border border-[#C84FFF]/50"
          )}
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
