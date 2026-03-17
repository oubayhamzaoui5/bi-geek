"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface AdminPageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function AdminPageHeader({ title, description, breadcrumbs }: AdminPageHeaderProps) {
  return (
    <div className="border-b border-border/50 bg-background/60 backdrop-blur-sm px-6 md:px-8 py-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Link
            href="/admin-dashboard/overview"
            className="hover:text-foreground transition-colors"
          >
            Accueil
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={12} />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}
