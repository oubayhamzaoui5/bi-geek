"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "./badge"
import { Clock, TrendingUp } from "lucide-react"

// 🔹 Types
type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  tags?: string[]
  image?: string | null
}

type ProgramVariant = "course" | "bootcamp"

interface ProgramCardProps {
  program: Program
  variant?: ProgramVariant
}

// 🔹 Component
export function ProgramCard({
  program,
  variant = "course",
}: ProgramCardProps) {
  const safeTags = Array.isArray(program.tags) ? program.tags : []
  const primaryTag = safeTags[0]?.trim() || "Formation"

  const href =
    variant === "bootcamp"
      ? `/bootcamp/${program.id}`
      : `/course/${program.id}`

  return (
    <Card
      className="
        group h-full w-full flex flex-col
        border border-gray
        hover:border-accent hover:shadow-lg hover:scale-103
        transition-transform duration-300 ease-out
      "
    >
      {/* 🔹 Header */}
      <CardHeader className="flex flex-col gap-1 p-2 md:p-4">
        <Badge className="bg-accent/10 text-accent text-xs md:text-sm w-fit">
          {primaryTag}
        </Badge>

        {program.image && (
          <div className="w-full aspect-video overflow-hidden rounded-sm">
            <img
              src={program.image}
              alt={program.title}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        <h3
          className="
            text-base md:text-xl
            font-semibold md:font-bold
            text-slate-900 dark:text-white
            group-hover:text-accent
            transition-colors duration-300
            leading-snug
            mt-0.5 md:mt-1
            text-center md:text-left
          "
        >
          {program.title}
        </h3>
      </CardHeader>

      {/* 🔹 Content */}
      <CardContent className="flex-1 px-2 py-1 md:px-4 md:py-2">
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed text-center md:text-left">
          {program.shortDescription}
        </p>
      </CardContent>

      {/* 🔹 Footer */}
      <CardFooter
        className="
          flex gap-2 items-center px-2 py-1 md:px-4 md:py-2
          justify-between
          border-t border-accent/20
        "
      >
        <div className="flex items-center gap-1 text-sm md:text-sm text-muted-foreground">
          <Clock className="h-4 w-4 md:h-4 md:w-4" />
          <span>{program.durationLabel}</span>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-accent hover:text-[#7d3d9f] hover:bg-transparent cursor-pointer text-sm md:text-sm"
        >
          <Link href={href} className="flex items-center gap-1">
            Voir le programme
            <TrendingUp className="ml-1 h-4 w-4 md:h-4 md:w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
