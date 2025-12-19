// app/instructor-dashboard/page.tsx
"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"

import { WelcomeSection } from "@/components/welcome-section"
import { InstructorCourses } from "@/components/instructor/instructor-courses"
import { LiveSessionsPanel } from "@/components/instructor/live-sessions-panel"
import { AnnouncementsManager } from "@/components/instructor/announcements-manager"

import { SidebarProvider } from "@/components/ui/sidebar-context"

export default function InstructorDashboardPage() {
  return (
    <SidebarProvider>
    <div className="flex h-screen bg-muted/30">
      <Sidebar /* variant="instructor" */ />
      <main className="flex-1 overflow-auto">
        <Header />

        <div className="p-6 md:p-8 space-y-6">
          {/* ROW 1 — Welcome | Lives / Sessions | Annonces */}
                      <WelcomeSection name="Aziz" variant="instructor" />


          <section
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
            style={{ alignItems: "stretch" }}
          >
            {/* Both children fill the available row height */}
            <div className="flex flex-col h-full">
              <LiveSessionsPanel />
            </div>
            <div className="flex flex-col h-full">
              <AnnouncementsManager />
            </div>
          </section>

          {/* ROW 2 — Analytics (wide) | Grading */}
               <InstructorCourses
                filters={["Actifs", "À venir", "Modéré"]}
                defaultFilter="Actifs"
              />
            

        </div>

        <Footer />
      </main>
      <MessagesTab />
    </div>
    </SidebarProvider>
  )
}
