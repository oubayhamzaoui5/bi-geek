"use client"

import { useSearchParams, useParams } from "next/navigation"
import { Suspense } from "react"
import PDFViewerCanvas, { BreadcrumbItem } from "@/components/pdf/PDFViewerCanvas"

function StudentPDFViewer() {
  const { slug }  = useParams<{ slug: string }>()
  const sp        = useSearchParams()
  const url         = sp.get("url")          || ""
  const name        = sp.get("name")         || "document.pdf"
  const groupTitle  = sp.get("groupTitle")   || slug
  const lessonTitle = sp.get("lessonTitle")  || ""
  const lessonId    = sp.get("lessonId")     || ""
  const attachmentId = sp.get("attachmentId") || undefined

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Accueil",  href: "/student-dashboard" },
    { label: "Formations",  href: "/student-dashboard/groups" },
    { label: groupTitle, href: `/student-dashboard/groups/${slug}` },
    ...(lessonTitle && lessonId
      ? [{ label: lessonTitle, href: `/student-dashboard/groups/${slug}/lessons/${lessonId}` }]
      : []),
    { label: name },
  ]

  return (
    <PDFViewerCanvas
      url={url}
      name={name}
      breadcrumbs={breadcrumbs}
      attachmentId={attachmentId}
    />
  )
}

export default function StudentPDFViewerPage() {
  return (
    <Suspense>
      <StudentPDFViewer />
    </Suspense>
  )
}
