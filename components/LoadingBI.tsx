"use client"

export default function LoadingBI({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? "h-[100vh]" : "h-full"}`}>
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Rotating ring */}
        <div className="absolute inset-0 rounded-full border-6 border-accent/20 border-t-accent animate-spin" />

        {/* Center text */}
        <span className="text-3xl font-bold text-accent ">
          BI
        </span>
      </div>
    </div>
  )
}
