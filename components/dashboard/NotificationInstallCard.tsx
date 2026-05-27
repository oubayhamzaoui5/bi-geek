"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, CheckCircle2 } from "lucide-react"
import { registerDashboardPushNotifications, unregisterDashboardPushNotifications } from "@/components/PushNotificationPrompt"

function AndroidLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3DDC84">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5S11 23.33 11 22.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zm-2.5-10C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84 1.3-1.3a.496.496 0 0 0 0-.7.503.503 0 0 0-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1c-1.1 0-2.15.23-3.12.63L7.4.15a.503.503 0 0 0-.71 0 .496.496 0 0 0 0 .7l1.3 1.3A5.983 5.983 0 0 0 6 7h12a5.983 5.983 0 0 0-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  )
}

function AppleLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#000">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
}

export function NotificationInstallCard() {
  const [userId, setUserId] = useState("")
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null")
      setUserId(user?.id || "")
    } catch {}

    setStandalone(isStandaloneMode())

    const supported =
      "Notification" in window && "serviceWorker" in navigator && "PushManager" in window

    if (!supported) {
      setPermission("unsupported")
    } else {
      const perm = Notification.permission
      setPermission(perm)
      if (perm === "granted") {
        navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
          reg?.pushManager.getSubscription().then((sub) => {
            setSubscribed(!!sub)
          })
        }).catch(() => {})
      }
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  async function toggleNotifications() {
    if (busy || permission === "unsupported" || permission === "denied") return
    setBusy(true)
    try {
      if (subscribed) {
        await unregisterDashboardPushNotifications(userId)
        setSubscribed(false)
      } else {
        let perm = permission
        if (perm === "default") {
          perm = await Notification.requestPermission()
          setPermission(perm)
        }
        if (perm === "granted" && userId) {
          await registerDashboardPushNotifications(userId)
          setSubscribed(true)
        }
      }
    } catch {}
    setBusy(false)
  }

  async function handleAndroidInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") {
      setInstalled(true)
      setInstallPrompt(null)
    }
  }

  const notifOn = permission === "granted" && subscribed
  const notifDenied = permission === "denied"
  const notifUnsupported = permission === "unsupported"
  const appInstalled = standalone || installed

  return (
    <>
      <style>{`
        .ni-card { display: flex; flex-direction: row; }
        .ni-divider { width: 1px; background: #f1f5f9; margin: 12px 0; flex-shrink: 0; }
        @media (max-width: 540px) {
          .ni-card { flex-direction: column; }
          .ni-divider { width: auto; height: 1px; margin: 0 12px; }
        }
      `}</style>
      <div
        className="ni-card"
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,.05)",
        }}
      >
        {/* Left — Notifications */}
        <div style={{ flex: 1, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: notifOn ? "rgba(124,58,237,0.1)" : "rgba(100,116,139,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {notifOn
              ? <Bell size={18} color="#7c3aed" />
              : <BellOff size={18} color="#94a3b8" />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>
              Notifications
            </p>
            <p style={{ fontSize: 11, margin: 0, lineHeight: 1.3, color: notifDenied ? "#ef4444" : "#94a3b8" }}>
              {notifDenied
                ? "Bloquées dans les réglages du navigateur"
                : notifUnsupported
                ? "Non supportées sur ce navigateur"
                : notifOn
                ? "Activées · appuyez pour désactiver"
                : permission === "granted"
                ? "Désactivées · appuyez pour réactiver"
                : "Appuyez pour activer"}
            </p>
          </div>

          {/* Toggle switch */}
          <button
            onClick={toggleNotifications}
            disabled={busy || notifDenied || notifUnsupported}
            aria-label={notifOn ? "Désactiver les notifications" : "Activer les notifications"}
            style={{
              width: 46, height: 27, borderRadius: 14, border: "none", padding: 0, flexShrink: 0,
              background: notifOn ? "#7c3aed" : notifDenied ? "#fee2e2" : "#e2e8f0",
              position: "relative",
              cursor: notifDenied || notifUnsupported ? "default" : "pointer",
              transition: "background .2s", outline: "none",
            }}
          >
            <span
              style={{
                position: "absolute", top: 3.5,
                left: notifOn ? 22 : 3,
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                boxShadow: "0 1px 4px rgba(0,0,0,.22)",
                transition: "left .18s",
                display: "block",
              }}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="ni-divider" />

        {/* Right — Install as app */}
        <div style={{ flex: 1, padding: "14px 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 10px" }}>
            Télécharger l'application · téléphone
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Android */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}><AndroidLogo size={20} /></div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 2px" }}>Android</p>
                {appInstalled ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={11} color="#16a34a" />
                    <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Application installée</span>
                  </div>
                ) : installPrompt ? (
                  <button
                    onClick={handleAndroidInstall}
                    style={{
                      fontSize: 11, fontWeight: 700, color: "#7c3aed",
                      background: "rgba(124,58,237,0.07)", border: "none",
                      borderRadius: 6, padding: "3px 8px", cursor: "pointer",
                    }}
                  >
                    Installer maintenant →
                  </button>
                ) : (
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
                    Menu <strong style={{ color: "#64748b" }}>⋮</strong> → <em>"Ajouter à l'écran d'accueil"</em>
                  </p>
                )}
              </div>
            </div>

            {/* iOS */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}><AppleLogo size={20} /></div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>iOS</p>
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: "#0369a1",
                    background: "#e0f2fe", padding: "1px 6px", borderRadius: 4, letterSpacing: ".03em",
                  }}>
                    Safari uniquement
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.45 }}>
                  Icône <strong style={{ color: "#0ea5e9" }}>⎋</strong> en bas → <em>"Sur l'écran d'accueil"</em>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
