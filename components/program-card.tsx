"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "./badge"
import { Clock, TrendingUp } from "lucide-react"

type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  tags?: string[]
  image?: string | null
  slug?: string
}

type ProgramVariant = "course" | "bootcamp"

interface ProgramCardProps {
  program: Program
  variant?: ProgramVariant
  hrefOverride?: string
}

export function ProgramCard({ program, variant = "course", hrefOverride }: ProgramCardProps) {
  const safeTags = Array.isArray(program.tags) ? program.tags : []
  const primaryTag = safeTags[0]?.trim() || "Formation"

  const [slug, setSlug] = useState<string>(program.slug ?? program.id)

  useEffect(() => {
    if (program.slug) return

    fetch(`/api/slug/${variant}/${program.id}`)
      .then(res => res.json())
      .then(data => setSlug(data.slug ?? program.id))
      .catch(() => setSlug(program.id))
  }, [program.id, program.slug, variant])

  const href =
    hrefOverride ??
    (variant === "bootcamp"
      ? `/bootcamp/${slug}`
      : `/course/${slug}`)

  return (
    <Link href={href} className="block h-full">
      <Card
        className="
          group h-full w-full flex flex-col
          border border-gray
          hover:border-accent hover:shadow-lg hover:scale-103
          transition-transform duration-300 ease-out
          cursor-pointer
        "
      >
        <CardHeader className="flex flex-col gap-1 px-2 md:px-4  ">
          <Badge className="bg-accent/10 text-accent text-xs md:text-sm w-fit">
            {primaryTag}
          </Badge>

          <div className="w-full aspect-video overflow-hidden rounded-sm mb-2">
            <img
              src={program.image || "/placeholder-course.png"}
              alt={program.title}
              className="object-cover w-full h-full"
            />
          </div>

          <h3 className="text-base md:text-xl font-semibold md:font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors duration-300 leading-snug w-full text-center md:text-left">
            {program.title}
          </h3>
        </CardHeader>

        <CardContent className="flex-1 px-2 py-1 md:px-4 md:py-2">
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed text-center md:text-left">
            {program.shortDescription}
          </p>
        </CardContent>

        <CardFooter className="flex gap-2 items-center px-2 py-1 md:px-4 md:py-2 justify-between border-t border-accent/20">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{program.durationLabel}</span>
          </div>

          {/* Visual button only (no nested Link) */}
          <Button
            variant="ghost"
            size="sm"
            className="pointer-events-none text-accent hover:text-[#7d3d9f]"
          >
            Voir le programme
            <TrendingUp className="ml-1 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
