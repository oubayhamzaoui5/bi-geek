"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import ProfileCard from "@/components/ProfileCard"
import PasswordCard from "@/components/PasswordCard"
import { Settings } from "lucide-react"

import { SidebarProvider } from "@/components/ui/sidebar-context"

export default function SettingsPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <Header />

          <div className="p-6 md:p-8 space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Settings className="text-accent" size={28} />
                Paramètres
              </h2>
              <p className="text-sm text-muted-foreground">
                Gérez votre profil et la sécurité de votre compte
              </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProfileCard />
              <PasswordCard />
            </div>
          </div>

          <Footer />
        </main>

        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
