"use client"

import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import { MessagesTab } from "@/components/messages-tab"
import { useRouter } from "next/navigation"
import { DashboardLoadingProvider, useDashboardLoading } from "@/components/dashboard-loading-context"
import { PushNotificationPrompt, registerDashboardPushNotifications } from "@/components/PushNotificationPrompt"

async function checkTodaySessionNotifications(studentId: string) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return
  if (Notification.permission !== "granted") return
  const hour = new Date().getHours()
  if (hour < 8) return

  const today = new Date().toISOString().slice(0, 10)
  const key = `seance_notified_${today}_${studentId}`
  if (localStorage.getItem(key)) return

  try {
    const res = await fetch(`/api/student/sessions/today?studentId=${studentId}`)
    if (!res.ok) return
    const data = await res.json()
    const sessions: any[] = data.sessions || []

    localStorage.setItem(key, "1")
    if (sessions.length === 0) return

    const reg = await navigator.serviceWorker.ready
    for (const s of sessions) {
      const groupTitle = s.groupTitle || s.title || "Séance"
      await reg.showNotification(`Séance aujourd'hui — ${groupTitle}`, {
        body: `${s.start_time} · Confirmez votre présence`,
        icon: "/notification-icon.png",
        badge: "/notification-badge.png",
        data: { url: `/student-dashboard/seance/${s.id}` },
        tag: `seance-${s.id}`,
        requireInteraction: true,
      } as NotificationOptions)
    }
  } catch (err) {
    console.warn("Today session notification failed:", err)
  }
}

function MessagesTabConditional() {
  const { loading } = useDashboardLoading()
  if (loading) return null
  return <MessagesTab />
}

export default function StudentDashboardLayout({
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
      return !!user && user.role === "student"
    } catch {
      return false
    }
  })

  useEffect(() => {
    const userString = localStorage.getItem("user")
    const user = userString ? JSON.parse(userString) : null

    if (!user) {
      router.push("/login")
    } else if (user.role !== "student") {
      router.push("/")
    } else {
      setAuthorized(true)
      setUserId(user.id)
      registerDashboardPushNotifications(user.id).catch((err) => {
        console.warn("Push registration failed:", err)
      })
      checkTodaySessionNotifications(user.id)
    }
  }, [router])

  if (authorized === null || !authorized) return null

  return (
    <DashboardLoadingProvider>
      <SidebarProvider>
        <div className="h-screen bg-[#fafafa]">
          <Sidebar compact />
          <main className="dashboard-responsive-main md:ml-[60px] h-screen overflow-auto">{children}</main>
          <MessagesTabConditional />
          {userId && (
            <PushNotificationPrompt
              userId={userId}
              onEnabled={() => checkTodaySessionNotifications(userId)}
            />
          )}
        </div>
      </SidebarProvider>
    </DashboardLoadingProvider>
  )
}
