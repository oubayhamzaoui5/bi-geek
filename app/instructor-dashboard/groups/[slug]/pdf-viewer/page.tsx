import PDFViewerCanvas, { BreadcrumbItem } from "@/components/pdf/PDFViewerCanvas"

export default async function InstructorPDFViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug }    = await params
  const sp          = await searchParams
  const url         = (sp.url  as string) || ""
  const name        = (sp.name as string) || "document.pdf"
  const groupTitle  = (sp.groupTitle  as string) || slug
  const lessonTitle = (sp.lessonTitle as string) || ""
  const lessonId    = (sp.lessonId    as string) || ""

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Accueil",  href: "/instructor-dashboard/overview" },
    { label: "Formations",  href: "/instructor-dashboard/groups" },
    { label: groupTitle, href: `/instructor-dashboard/groups/${slug}` },
    ...(lessonTitle && lessonId
      ? [{ label: lessonTitle, href: `/instructor-dashboard/groups/${slug}/lessons/${lessonId}` }]
      : []),
    { label: name },
  ]

  return <PDFViewerCanvas url={url} name={name} breadcrumbs={breadcrumbs} />
}
