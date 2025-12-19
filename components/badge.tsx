import type React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "accent" | "outline"
  className?: string
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        {
          "bg-secondary text-secondary-foreground": variant === "default",
          "bg-[#954ABF] text-white": variant === "accent",
          "border border-border bg-background text-foreground": variant === "outline",
        },
        className,
      )}
    >
      {children}
    </span>
  )
}
