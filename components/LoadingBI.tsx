"use client"

import { usePathname } from "next/navigation"

type LoadingBIProps = {
  fullScreen?: boolean
}

export default function LoadingBI({ fullScreen = true }: LoadingBIProps) {
  const pathname = usePathname()
  const isDashboardRoute =
    pathname?.startsWith("/admin-dashboard") ||
    pathname?.startsWith("/student-dashboard") ||
    pathname?.startsWith("/instructor-dashboard")
  const shouldCoverViewport = fullScreen || isDashboardRoute

  return (
    <div style={{
      position: shouldCoverViewport ? "fixed" : "relative",
      inset: shouldCoverViewport ? 0 : undefined,
      zIndex: shouldCoverViewport ? 9999 : undefined,
      width: shouldCoverViewport ? "100vw" : "100%",
      height: shouldCoverViewport ? "100dvh" : "100%",
      minHeight: shouldCoverViewport ? "100dvh" : undefined,
      background: "var(--background, #fafafa)",
      display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <style>{`
        @keyframes _blob {
          0%   { border-radius: 58% 42% 52% 48% / 44% 56% 44% 56%; }
          16%  { border-radius: 42% 58% 38% 62% / 60% 40% 62% 38%; }
          33%  { border-radius: 64% 36% 58% 42% / 38% 64% 36% 64%; }
          50%  { border-radius: 36% 64% 46% 54% / 58% 42% 58% 42%; }
          66%  { border-radius: 52% 48% 64% 36% / 46% 54% 46% 54%; }
          83%  { border-radius: 46% 54% 36% 64% / 62% 38% 60% 40%; }
          100% { border-radius: 58% 42% 52% 48% / 44% 56% 44% 56%; }
        }

        @keyframes _blob_back {
          0%   { border-radius: 44% 56% 64% 36% / 56% 44% 52% 48%; }
          20%  { border-radius: 62% 38% 44% 56% / 40% 60% 44% 56%; }
          45%  { border-radius: 38% 62% 56% 44% / 62% 38% 64% 36%; }
          70%  { border-radius: 56% 44% 38% 62% / 44% 56% 38% 62%; }
          100% { border-radius: 44% 56% 64% 36% / 56% 44% 52% 48%; }
        }

        @keyframes _breathe {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.045); }
        }
      `}</style>

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* back blob — lighter, slightly bigger, slower */}
        <div style={{
          position: "absolute",
          width: 148, height: 148,
          background: "color-mix(in oklch, var(--accent) 45%, white)",
          opacity: 0.55,
          animation: "_blob_back 6s ease-in-out infinite, _breathe 6s ease-in-out infinite",
        }} />

        {/* main blob */}
        <div style={{
          width: 124, height: 124,
          background: "var(--accent)",
          boxShadow: "0 20px 60px color-mix(in oklch, var(--accent) 35%, transparent)",
          animation: "_blob 4s ease-in-out infinite, _breathe 4s ease-in-out infinite",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.04em",
            fontFamily: "'DM Sans', sans-serif",
            userSelect: "none",
          }}>BI</span>
        </div>

      </div>
    </div>
  )
}
