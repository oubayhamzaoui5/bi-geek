"use client"

import "@mux/mux-player" // registers <mux-player/> globally
import React from "react"

type MuxPlayerClientProps = {
  playbackId: string
  title?: string
  poster?: string
  className?: string
  // optional UX flags
  autoplay?: boolean
  muted?: boolean
}

export default function MuxPlayerClient({
  playbackId,
  title = "Lecture vidéo",
  poster,
  className = "",
  autoplay,
  muted,
}: MuxPlayerClientProps) {
  return (
    <div className={className}>
      {/* Responsive 16:9 container */}
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        <mux-player
          playback-id={playbackId}
          stream-type="on-demand"
          title={title}
          poster={poster}
          accent-color="#22c55e"
          // Uncomment if you want:
          // default-hidden-captions
          // preload="metadata"
          // loop
          // Prefer controlling autoplay/muted via props:
          {...(autoplay ? { autoplay: true } : {})}
          {...(muted ? { muted: true } : {})}
          style={{ width: "100%", height: "100%", borderRadius: "16px", overflow: "hidden" }}
          metadata-video-title={title}
          metadata-viewer-user-id="anonymous"
        ></mux-player>
      </div>
    </div>
  )
}
