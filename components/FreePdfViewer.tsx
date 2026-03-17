'use client'

import React from 'react'

type Props = {
  file: string
  height?: string | number
}

export default function FreePdfViewer({ file, height = '100%' }: Props) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0b0b0f] via-[#0d0f14] to-[#0a0b10] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.45)]"
      style={{ height }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
          <span className="truncate">PDF Preview</span>
          <a
            href={file}
            download
            className="rounded-md border border-white/10 px-2 py-1 text-white/80"
          >
            Download
          </a>
        </div>

        <div className="flex-1 overflow-hidden">
          <iframe
            src={file}
            title="PDF Preview"
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  )
}
