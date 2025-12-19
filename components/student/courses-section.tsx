"use client"

import { ProgramCard } from "@/components/program-card"
import type { Program } from "@/data/programs"
import { useSidebar } from "@/components/ui/sidebar-context"

interface CoursesSectionProps {
  showCompleted?: boolean
}

const programs: Program[] = [
  { id: 1, title: "Fondamentaux de Power BI", shortDescription: "Apprenez à créer des rapports interactifs et à connecter vos données avec Power BI.", category: "BI", level: "Débutant", hours: 12 },
  { id: 2, title: "Visualisation de Données Avancée", shortDescription: "Approfondissez vos compétences en storytelling visuel et dashboards analytiques.", category: "Data", level: "Intermédiaire", hours: 15 },
  { id: 3, title: "SQL pour l’Analyse de Données", shortDescription: "Maîtrisez les requêtes SQL pour extraire, transformer et analyser vos données.", category: "BI", level: "Avancé", hours: 10 },
  { id: 4, title: "Développement Web Moderne avec React", shortDescription: "Créez des interfaces modernes et performantes avec React et Next.js.", category: "Web", level: "Intermédiaire", hours: 20 },
  { id: 5, title: "Introduction au Cloud avec Azure", shortDescription: "Découvrez les bases du cloud computing et déployez vos premières solutions sur Azure.", category: "Cloud", level: "Débutant", hours: 8 },
  { id: 6, title: "Initiation à l’IA et au Machine Learning", shortDescription: "Comprenez les fondements de l’intelligence artificielle et du machine learning.", category: "AI/ML", level: "Débutant", hours: 18 },
]

export function CoursesSection({ showCompleted = false }: CoursesSectionProps) {
  const { isCollapsed } = useSidebar()
  const filteredPrograms = programs

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-accent mb-2">
        {showCompleted ? "Formations complétés" : "Formations actifs"}
      </h2>

      <div
        className={`
          grid gap-6 grid-cols-1
          ${isCollapsed ? "md:grid-cols-3 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-2"}
          transition-[grid-template-columns] duration-200
        `}
      >
        {filteredPrograms.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </div>
    </section>
  )
}
