"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CheckCircle2, Download, Smartphone } from "lucide-react"
import { registerDashboardPushNotifications } from "@/components/PushNotificationPrompt"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
}

export function MobileAppInstallAction() {
  const [userId, setUserId] = useState("")
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null")
      setUserId(user?.id || "")
    } catch {
      setUserId("")
    }

    setStandalone(isStandaloneApp())
    setNotificationPermission(
      "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
        ? Notification.permission
        : "unsupported",
    )

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setStandalone(true)
      setInstallPrompt(null)
      setMessage("Application installee.")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  const status = useMemo(() => {
    if (standalone && notificationPermission === "granted") return "ready"
    if (notificationPermission === "denied") return "blocked"
    return "available"
  }, [notificationPermission, standalone])

  async function handleClick() {
    setBusy(true)
    setMessage("")

    try {
      if (installPrompt && !standalone) {
        await installPrompt.prompt()
        const choice = await installPrompt.userChoice
        setInstallPrompt(null)
        if (choice.outcome === "accepted") setStandalone(true)
      }

      if (notificationPermission === "unsupported") {
        setMessage("Notifications non supportees sur ce navigateur.")
        return
      }

      let permission = notificationPermission
      if (permission !== "granted") {
        permission = await Notification.requestPermission()
        setNotificationPermission(permission)
      }

      if (permission === "granted" && userId) {
        const enabled = await registerDashboardPushNotifications(userId)
        setMessage(enabled ? "Notifications activees sur ce telephone." : "Impossible d'activer les notifications.")
      } else if (permission === "denied") {
        setMessage("Notifications bloquees dans les reglages du telephone.")
      } else {
        setMessage("Activation annulee.")
      }
    } catch (err) {
      console.warn("Mobile app action failed:", err)
      setMessage("Activation impossible pour le moment.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <style>{`
        .mobile-app-action { display: none; }
        @media (max-width: 767px) {
          .mobile-app-action {
            display: block;
            margin: 0 0 16px;
          }
        }
      `}</style>
      <div className="mobile-app-action">
        <button
          type="button"
          onClick={handleClick}
          disabled={busy || status === "ready"}
          style={{
            width: "100%",
            minHeight: 52,
            borderRadius: 14,
            border: status === "ready" ? "1px solid #bbf7d0" : "1px solid rgba(139,15,130,0.24)",
            background: status === "ready" ? "#f0fdf4" : "#ffffff",
            color: status === "ready" ? "#15803d" : "#0f172a",
            boxShadow: "0 8px 24px rgba(15,23,42,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "0 14px",
            fontSize: 13,
            fontWeight: 900,
            cursor: busy || status === "ready" ? "default" : "pointer",
          }}
        >
          {status === "ready" ? <CheckCircle2 size={18} /> : <Smartphone size={18} />}
          <span>{busy ? "Activation..." : status === "ready" ? "App et notifications activees" : "Installer l'app et activer les notifications"}</span>
          {status !== "ready" && (notificationPermission === "granted" ? <Download size={16} /> : <Bell size={16} />)}
        </button>
        {message && (
          <p style={{ margin: "8px 2px 0", color: status === "blocked" ? "#b91c1c" : "#475569", fontSize: 12, fontWeight: 700 }}>
            {message}
          </p>
        )}
      </div>
    </>
  )
}
