"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface InstructorPageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
}

export function InstructorPageHeader({ title, description, breadcrumbs, actions }: InstructorPageHeaderProps) {
  return (
    <div className="border-b border-gray-100 bg-white px-6 md:px-8 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-gray-400 mb-2">
              <Link href="/instructor-dashboard/overview" className="hover:text-gray-700 transition-colors">
                Accueil
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight size={11} />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-gray-700 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-700 font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--ff-display)" }}>{title}</h1>
          {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 mt-1 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
