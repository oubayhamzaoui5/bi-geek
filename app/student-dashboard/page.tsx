"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { WelcomeSection } from "@/components/welcome-section"
import { CoursesSection } from "@/components/student/courses-section"
import { ProgressOverview } from "@/components/student/progress-overview"
import { UpcomingSessions } from "@/components/student/upcoming-sessions"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { RecentAnnouncements } from "@/components/student/recent-announcements"
import { SidebarProvider } from "@/components/ui/sidebar-context"

export default function Dashboard() {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header />
          <div className="p-6 md:p-8 space-y-6">
            <WelcomeSection name="Oubay" variant="student" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="h-full min-h-0">
                <UpcomingSessions />

              </div>
              <div className="h-full min-h-0">
                <RecentAnnouncements />

              </div>
            </div>

            <CoursesSection showCompleted={false} />
            <div className="mb-12" />
            <CoursesSection showCompleted={true} />
          </div>

          <Footer />
        </main>
        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
