"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"

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
  return (
    <section className="w-full py-4 pb-8 md:py-8 px-0">
      {/* Mobile carousel */}
      <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="snap-center min-w-[80%]"
          >
            <CategoryCard category={cat} />
          </motion.div>
        ))}
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: i * 0.07 }}
          >
            <CategoryCard category={cat} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/formations?category=${encodeURIComponent(category.title)}`}>
      <div className="group relative overflow-hidden rounded-none bg-white border border-border hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10">

        {/* Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={category.imageUrl || "/placeholder.svg"}
            alt={category.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Subtle overlay on hover */}
          <div className="absolute inset-0 bg-accent/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden />
        </div>

        {/* Content */}
        <div className="p-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-base text-foreground group-hover:text-accent transition-colors duration-300 mb-1">
              {category.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {category.description}
            </p>
          </div>
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-none border border-border flex items-center justify-center group-hover:border-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
            <ArrowUpRight size={15} />
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="h-[2px] w-0 bg-accent group-hover:w-full transition-all duration-400 ease-out" />
      </div>
    </Link>
  )
}
