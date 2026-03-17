'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface PDFViewerClientProps {
  pdfUrl: string
  filename: string
}

export default function PDFViewerClient({ pdfUrl, filename }: PDFViewerClientProps) {
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [swReady, setSwReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Register service worker, then signal ready so iframe can load
    async function registerSW() {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/pdf-cache-worker.js')
          // Wait for SW to be controlling the page
          if (navigator.serviceWorker.controller) {
            setSwReady(true)
          } else {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              setSwReady(true)
            })
            // Fallback: load anyway after 800ms even if SW not controlling yet
            setTimeout(() => setSwReady(true), 800)
          }
        } catch {
          // SW failed — load directly anyway
          setSwReady(true)
        }
      } else {
        setSwReady(true)
      }
    }

    // Check if it will be served from cache
    async function checkCache() {
      if ('caches' in window) {
        try {
          const cache = await caches.open('pdf-cache-v1')
          const match = await cache.match(pdfUrl)
          setFromCache(!!match)
        } catch {
          // ignore
        }
      }
    }

    registerSW()
    checkCache()
  }, [pdfUrl])

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch {
      // fallback: open in new tab
      window.open(pdfUrl, '_blank')
    }
  }, [pdfUrl, filename])

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const displayName = filename
    .replace(/[-_]/g, ' ')
    .replace(/\.pdf$/i, '')

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen bg-[#0f0f0f] text-white"
    >
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/10 shrink-0">
        {/* Left — back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            aria-label="Go back"
            onClick={() => window.history.back()}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-white/80 truncate capitalize">{displayName}</span>
        </div>

        {/* Right — badges + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {fromCache && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Cached
            </span>
          )}

          <button
            aria-label="Download PDF"
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={handleFullscreen}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* PDF area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading spinner — shown until iframe fires onLoad */}
        {(loading || !swReady) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f0f] z-10 gap-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            <span className="text-white/40 text-sm">Loading PDF...</span>
          </div>
        )}

        {/* Only render iframe once SW is registered to ensure caching works */}
        {swReady && (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title={displayName}
            onLoad={() => setLoading(false)}
            className="w-full h-full border-0"
            style={{ display: loading ? 'none' : 'block' }}
          />
        )}
      </div>
    </div>
  )
}
