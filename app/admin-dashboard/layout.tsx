"use client"

import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import { usePathname, useRouter } from "next/navigation"
import LoadingBI from "@/components/LoadingBI"
import { DashboardLoadingProvider } from "@/components/dashboard-loading-context"
import { PushNotificationPrompt, registerDashboardPushNotifications } from "@/components/PushNotificationPrompt"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null")
      return !!user && (user.role === "admin" || user.role === "admin_agent")
    } catch {
      return false
    }
  })

  useEffect(() => {
    const userString = localStorage.getItem("user")
    const user = userString ? JSON.parse(userString) : null

    if (!user) {
      router.push("/login")
    } else if (user.role !== "admin" && user.role !== "admin_agent") {
      router.push("/")
    } else {
      if (user.role === "admin" && pathname !== "/admin-dashboard/users") {
        router.replace("/admin-dashboard/users")
        return
      }
      setAuthorized(true)
      setUserId(user.id)
      registerDashboardPushNotifications(user.id).catch((err) => {
        console.warn("Push registration failed:", err)
      })
    }
  }, [pathname, router])

  if (authorized === null || !authorized) return <LoadingBI />

  return (
    <DashboardLoadingProvider>
      <SidebarProvider>
        <div className="h-screen bg-[#fafafa]">
          <Sidebar variant="admin" />
          <main className="dashboard-responsive-main md:ml-[60px] h-screen overflow-auto">{children}</main>
          {userId && <PushNotificationPrompt userId={userId} />}
        </div>
      </SidebarProvider>
    </DashboardLoadingProvider>
  )
}
