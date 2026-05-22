"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

type PushNotificationPromptProps = {
  userId: string
  onEnabled?: () => void
}

function urlBase64ToUint8Array(base64: string) {
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=")
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function registerDashboardPushNotifications(userId: string) {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false
  }

  if (Notification.permission !== "granted") return false

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return false

  const reg = await navigator.serviceWorker.register("/sw.js")
  const existing = await reg.pushManager.getSubscription()
  const subscription = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })

  await fetch("/api/dashboard/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
  })

  return true
}

export function PushNotificationPrompt({ userId, onEnabled }: PushNotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported")
      return
    }

    setPermission(Notification.permission)

    if (Notification.permission === "granted") {
      registerDashboardPushNotifications(userId).catch((err) => {
        console.warn("Push registration failed:", err)
      })
    }
  }, [userId])

  const enableNotifications = async () => {
    if (!("Notification" in window)) return
    setBusy(true)
    try {
      const nextPermission = await Notification.requestPermission()
      setPermission(nextPermission)
      if (nextPermission === "granted") {
        const enabled = await registerDashboardPushNotifications(userId)
        if (enabled) onEnabled?.()
      }
    } catch (err) {
      console.warn("Push permission failed:", err)
    } finally {
      setBusy(false)
    }
  }

  if (permission !== "default") return null

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 60,
        left: "max(14px, env(safe-area-inset-left))",
        right: "max(14px, env(safe-area-inset-right))",
        bottom: "max(14px, env(safe-area-inset-bottom))",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <button
        type="button"
        onClick={enableNotifications}
        disabled={busy}
        style={{
          pointerEvents: "auto",
          width: "min(100%, 380px)",
          minHeight: 52,
          borderRadius: 12,
          border: "1px solid rgba(15,23,42,0.12)",
          background: "#0f172a",
          color: "#fff",
          boxShadow: "0 16px 40px rgba(15,23,42,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontSize: 14,
          fontWeight: 800,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        <Bell size={18} />
        {busy ? "Activation..." : "Activer les notifications"}
      </button>
    </div>
  )
}
