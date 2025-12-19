import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { CurriculumSection } from "@/components/student/curriculum-section"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { CourseProgress } from "@/components/student/course-progress"
import { SidebarProvider } from "@/components/ui/sidebar-context"

export default function CourseDetailsPage() {
  return (
    <SidebarProvider>
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header />
        <div className="p-6 md:p-8 space-y-6">
          <CourseDetailsSection />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <CurriculumSection />
            </div>
            <div>
              <CourseProgress
                completedLessons={14}
                totalLessons={40}
                nextSession={{
                  title: "Session Live : Python avancé",
                  date: "25 Octobre 2025",
                  time: "18:00",
                }}
              />
            </div>
          </div>
        </div>
        <Footer />
      </main>
      <MessagesTab />
    </div>
    </SidebarProvider>
  )
}
