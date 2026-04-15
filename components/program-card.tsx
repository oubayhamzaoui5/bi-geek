"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Clock, ArrowRight } from "lucide-react"

type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel?: string
  tags?: string[]
  image?: string | null
  slug?: string
  progress?: number
}

type ProgramVariant = "course" | "bootcamp"

interface ProgramCardProps {
  program: Program
  variant?: ProgramVariant
  hrefOverride?: string
}

export function ProgramCard({ program, variant = "course", hrefOverride }: ProgramCardProps) {
  const safeTags   = Array.isArray(program.tags) ? program.tags : []
  const primaryTag = safeTags[0]?.trim() || "Formation"
  const [slug, setSlug] = useState<string>(program.slug ?? program.id)

  useEffect(() => {
    if (program.slug) return
    fetch(`/api/slug/${variant}/${program.id}`)
      .then((r) => r.json())
      .then((d) => setSlug(d.slug ?? program.id))
      .catch(() => setSlug(program.id))
  }, [program.id, program.slug, variant])

  const href =
    hrefOverride ?? (variant === "bootcamp" ? `/bootcamp/${slug}` : `/course/${slug}`)

  return (
    <Link href={href} className="block h-full group">
      <div className="h-full flex flex-col bg-white border border-border hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 rounded-none">

        {/* Image */}
        <div className="relative w-full aspect-video overflow-hidden bg-muted">
          <img
            src={program.image || "/placeholder-course.png"}
            alt={program.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          {/* Tag overlay */}
          <div className="absolute top-3 left-3">
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 bg-white/90 text-accent border border-accent/20 backdrop-blur-sm">
              {primaryTag}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <h3 className="font-display font-bold text-base text-foreground group-hover:text-accent transition-colors leading-snug">
            {program.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            {program.shortDescription}
          </p>

          {/* Progress */}
          {typeof program.progress === "number" && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span>Progression</span>
                <span className="font-semibold text-foreground">{Math.round(program.progress)}%</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-none overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-700"
                  style={{ width: `${program.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{program.durationLabel}</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              Voir le programme
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="h-[2px] w-0 bg-accent group-hover:w-full transition-all duration-400 ease-out" />
      </div>
    </Link>
  )
}
