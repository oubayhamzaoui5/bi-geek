"use client"

import { Paperclip } from "lucide-react"

export type Attachment = {
  label: string
  href: string
  filetype?: string // e.g. "PDF", "Notebook", "Dataset"
  size?: string     // e.g. "1.2 MB"
}

export default function AttachmentList({ items }: { items: Attachment[] }) {
  if (!items?.length) return null

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Pièces jointes</h3>
      <ul className="space-y-2">
        {items.map((a, i) => (
          <li key={i} className="flex items-center justify-between rounded border border-border p-3">
            <div className="flex items-center gap-3">
              <Paperclip className="w-4 h-4 text-accent" />
              <div>
                <a
                  href={a.href}
                  className="text-foreground hover:underline font-medium"
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.label}
                </a>
                <div className="text-xs text-muted-foreground">
                  {a.filetype ? `${a.filetype}` : ""}{a.filetype && a.size ? " • " : ""}{a.size || ""}
                </div>
              </div>
            </div>
            <a
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm px-3 py-1.5 rounded bg-muted hover:bg-muted/70"
            >
              Télécharger
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
