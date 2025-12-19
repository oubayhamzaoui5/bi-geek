"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { BookOpen } from "lucide-react"

import { Course, CourseStatus } from "@/components/student/CourseCard"
import { CourseSection } from "@/components/student/CourseSection"
import { SidebarProvider } from "@/components/ui/sidebar-context"

const courses: Course[] = [
  // Upcoming
  {
    id: 101,
    title: "Data Storytelling & Dashboards",
    progress: 0,
    duration: "8 heures",
    thumbnail: "/power-bi-dashboard.jpg",
    hasWork: false,
    status: "upcoming",
    startDate: "2025-11-04",
    applyUrl: "/apply/101",
  },
  {
    id: 102,
    title: "Python pour l’Analyse de Données",
    progress: 0,
    duration: "18 heures",
    thumbnail: "/power-bi-dashboard.jpg",
    hasWork: true,
    status: "upcoming",
    startDate: "2025-11-12",
    applyUrl: "/apply/102",
  },
    {
    id: 103,
    title: "Python pour l’Analyse de Données",
    progress: 0,
    duration: "18 heures",
    thumbnail: "/power-bi-dashboard.jpg",
    hasWork: true,
    status: "upcoming",
    startDate: "2025-11-12",
    applyUrl: "/apply/102",
  },
      {
    id: 104,
    title: "Python pour l’Analyse de Données",
    progress: 0,
    duration: "18 heures",
    thumbnail: "/power-bi-dashboard.jpg",
    hasWork: true,
    status: "upcoming",
    startDate: "2025-11-12",
    applyUrl: "/apply/102",
  },

  // Active
  {
    id: 1,
    title: "Fondamentaux de Power BI",
    progress: 65,
    duration: "12 heures",
    thumbnail: "/power-bi-dashboard.jpg",
    hasWork: true,
    status: "active",
  },
  {
    id: 2,
    title: "Visualisation de Données Avancée",
    progress: 40,
    duration: "15 heures",
    thumbnail: "/data-visualization-abstract.png",
    hasWork: false,
    status: "active",
  },

  // Completed (Old)
  {
    id: 3,
    title: "SQL pour l'Analyse de Données",
    progress: 100,
    duration: "10 heures",
    thumbnail: "/sql-database.jpg",
    hasWork: false,
    status: "completed",
  },
  // ...existing courses
{
  id: 201,
  title: "Power BI – Bootcamp Complet",
  progress: 0,
  duration: "14 heures",
  thumbnail: "/power-bi-dashboard.jpg",
  hasWork: true,
  status: "stored",
  applyUrl: "/apply/201",
},
{
  id: 202,
  title: "SQL de 0 à Héro",
  progress: 0,
  duration: "11 heures",
  thumbnail: "/sql-database.jpg",
  hasWork: false,
  status: "stored",
  applyUrl: "/apply/202",
},

]

export default function CoursesPage() {
  const byStatus = (status: CourseStatus) => courses.filter(c => c.status === status)

  return (
        <SidebarProvider>

    <div className="flex h-screen bg-muted/30">
     
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <Header />
        

        <div className="p-6 md:p-8 space-y-8">
           <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BookOpen className="text-accent" size={28} />
                Formations
              </h2>
          <CourseSection
            title="Prochains Formations"
            subtitle="Inscrivez-vous avant le début des sessions"
            courses={byStatus("upcoming")}
          />

          <CourseSection
            title="Formations actifs"
            subtitle="Reprenez là où vous vous êtes arrêté"
            courses={byStatus("active")}
          />

          <CourseSection
            title="Formations complétés"
            subtitle="Consultez vos cours terminés"
            courses={byStatus("completed")}
          />
          <CourseSection
          title="Formations enregistrés"
          subtitle="Apprenez à votre rythme — contenu prêt à regarder"
          courses={byStatus("stored")}
        />

        </div>

        <Footer />
      </main>

      <MessagesTab />
    </div>
        </SidebarProvider>

  )
}
