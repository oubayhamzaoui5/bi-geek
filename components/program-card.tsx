"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Clock, Zap, ArrowUpRight } from "lucide-react"

type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel?: string
  instructorName?: string
  tags?: string[]
  image?: string | null
  slug?: string
  progress?: number
  type?: "course" | "bootcamp"
}

type ProgramVariant = "course" | "bootcamp"

interface ProgramCardProps {
  program: Program
  variant?: ProgramVariant
  hrefOverride?: string
  href?: string
}

export function ProgramCard({ program, variant, hrefOverride, href: hrefProp }: ProgramCardProps) {
  const safeTags   = Array.isArray(program.tags) ? program.tags : []
  const [slug, setSlug] = useState<string>(program.slug ?? program.id)

  const resolvedVariant = variant ?? program.type ?? "course"
  const isBootcamp = resolvedVariant === "bootcamp"

  useEffect(() => {
    if (program.slug) return
    fetch(`/api/slug/${resolvedVariant}/${program.id}`)
      .then((r) => r.json())
      .then((d) => setSlug(d.slug ?? program.id))
      .catch(() => setSlug(program.id))
  }, [program.id, program.slug, resolvedVariant])

  const href = hrefProp ?? hrefOverride ?? (isBootcamp ? `/bootcamp/${slug}` : `/course/${slug}`)

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-zinc-200/80"
      style={{ border: isBootcamp ? "1.5px solid #18181b" : "1.5px solid #e4e4e7" }}
    >
      {/* Image */}
      <div className="relative aspect-[3/2] overflow-hidden bg-zinc-100">
        <img
          src={program.image || "/placeholder-course.webp"}
          alt={program.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Bootcamp badge */}
        {isBootcamp && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
            <Zap className="h-3 w-3 fill-amber-400 text-amber-400" />
            Bootcamp
          </div>
        )}

        {/* Tags on image bottom */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {safeTags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3
          className="text-base font-semibold leading-snug text-zinc-950 transition-colors group-hover:text-[#8b0f82]"
          style={{ letterSpacing: "-0.01em" }}
        >
          {program.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
          {program.shortDescription}
        </p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            {program.durationLabel || program.instructorName || "Programme"}
          </span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 group-hover:bg-[#8b0f82] group-hover:text-white"
            style={{ background: isBootcamp ? "#18181b" : "#f4f4f5", color: isBootcamp ? "#fff" : "#8b0f82" }}
          >
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>

      {/* Bootcamp accent bottom line */}
      {isBootcamp && (
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500" />
      )}
    </Link>
  )
}
