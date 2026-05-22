"use client"

import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { PushNotificationPrompt, registerDashboardPushNotifications } from "@/components/PushNotificationPrompt"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
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
      setAuthorized(true)
      setUserId(user.id)
      registerDashboardPushNotifications(user.id).catch((err) => {
        console.warn("Push registration failed:", err)
      })
    }
  }, [router])

  if (authorized === null || !authorized) return null

  return (
    <SidebarProvider>
      <div className="h-screen bg-[#fafafa]">
        <Sidebar variant="admin" />
        <main className="md:ml-[60px] h-screen overflow-auto">{children}</main>
        {userId && <PushNotificationPrompt userId={userId} />}
      </div>
    </SidebarProvider>
  )
}
