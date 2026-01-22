"use client"

import { useEffect } from "react"

export function MetaPixel({ pixelId }: { pixelId: string }) {
  useEffect(() => {
    if (!pixelId) return

    // @ts-ignore
    if (window.fbq) return

    const script = document.createElement("script")
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      // @ts-ignore
      window.fbq = window.fbq || function () {
        // @ts-ignore
        window.fbq.callMethod
          ? window.fbq.callMethod.apply(window.fbq, arguments)
          : window.fbq.queue.push(arguments)
      }
      // @ts-ignore
      window.fbq.queue = window.fbq.queue || []
      // @ts-ignore
      window.fbq.loaded = true
      // @ts-ignore
      window.fbq.version = "2.0"
      // @ts-ignore
      window.fbq.push = window.fbq

      // @ts-ignore
      window.fbq("init", pixelId)
      // @ts-ignore
      window.fbq("track", "PageView")
    }

    return () => {
      // optional cleanup
    }
  }, [pixelId])

  return null
}
