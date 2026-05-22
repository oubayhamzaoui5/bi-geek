"use client"

import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import { MessagesTab } from "@/components/messages-tab"
import { useRouter } from "next/navigation"
import { DashboardLoadingProvider, useDashboardLoading } from "@/components/dashboard-loading-context"

async function registerPushNotifications(studentId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
  try {
    const reg = await navigator.serviceWorker.register("/sw.js")
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    const urlBase64ToUint8Array = (base64: string) => {
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=")
      const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
      return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
    }

    const existing = await reg.pushManager.getSubscription()
    const subscription = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    await fetch("/api/student/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, subscription: subscription.toJSON() }),
    })
  } catch (err) {
    console.warn("Push registration failed:", err)
  }
}

async function checkTodaySessionNotifications(studentId: string) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return
  const hour = new Date().getHours()
  if (hour < 8) return

  const today = new Date().toISOString().slice(0, 10)
  const key = `seance_notified_${today}_${studentId}`
  if (localStorage.getItem(key)) return

  try {
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission()
    if (permission !== "granted") return

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
        icon: "/icon.svg",
        badge: "/icon-dark-32x32.png",
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
      registerPushNotifications(user.id)
      checkTodaySessionNotifications(user.id)
    }
  }, [router])

  if (authorized === null || !authorized) return null

  return (
    <DashboardLoadingProvider>
      <SidebarProvider>
        <div className="h-screen bg-[#fafafa]">
          <Sidebar compact />
          <main className="md:ml-[60px] h-screen overflow-auto">{children}</main>
          <MessagesTabConditional />
        </div>
      </SidebarProvider>
    </DashboardLoadingProvider>
  )
}
