self.addEventListener("push", (event) => {
  const data = event.data?.json() || {}
  const title = data.title || "BI Geek"
  const options = {
    body: data.body || "Nouvelle notification.",
    icon: "/icon.png",
    badge: "/apple-icon.png",
    data: { url: data.url || "/student-dashboard" },
    actions: Array.isArray(data.actions) ? data.actions : [],
    requireInteraction: data.requireInteraction !== false,
    tag: data.tag || `notification-${data.sessionId || "today"}`,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/student-dashboard"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
