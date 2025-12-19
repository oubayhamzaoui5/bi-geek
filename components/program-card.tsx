// components/program-card.tsx
"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "./badge"
import { Clock, TrendingUp } from "lucide-react"

type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  levelLabel: string
  tags?: string[]
}

interface ProgramCardProps {
  program: Program
}

const levelColors: Record<string, string> = {
  Débutant: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Intermédiaire: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Avancé: "bg-red-500/10 text-red-700 dark:text-red-400",
}

export function ProgramCard({ program }: ProgramCardProps) {
  // ✅ Make tags always an array to avoid crash
  const safeTags = Array.isArray(program.tags) ? program.tags : []

  // Show only ONE tag (first tag)
  const primaryTag = safeTags[0]?.trim() || "Formation"

  const levelClass =
    levelColors[program.levelLabel] ??
    "bg-slate-500/10 text-slate-700 dark:text-slate-300"

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Tag */}
          <Badge className="bg-accent/10 text-accent dark:text-accent">
            {primaryTag}
          </Badge>

          {/* Level */}
          <Badge className={levelClass}>{program.levelLabel}</Badge>
        </div>

        <h3 className="text-xl font-bold text-balance">{program.title}</h3>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-muted-foreground text-pretty leading-relaxed">
          {program.shortDescription}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{program.durationLabel}</span>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-accent hover:text-[#7d3d9f] hover:bg-transparent cursor-pointer"
        >
          <Link href={`/course/${program.id}`}>
            Voir le programme
            <TrendingUp className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
