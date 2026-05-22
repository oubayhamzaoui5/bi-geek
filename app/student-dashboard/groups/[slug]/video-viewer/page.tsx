import VideoViewerCanvas from "@/components/video/VideoViewerCanvas"
import { BreadcrumbItem } from "@/components/video/VideoViewerCanvas"

export default async function StudentVideoViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug }    = await params
  const sp          = await searchParams
  const url         = (sp.url  as string) || ""
  const title       = (sp.title as string) || "Vidéo"
  const groupTitle  = (sp.groupTitle  as string) || slug

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Vue d'ensemble",  href: "/student-dashboard/overview" },
    { label: "Mes formations",     href: "/student-dashboard/groups" },
    { label: groupTitle,        href: `/student-dashboard/groups/${slug}` },
    { label: title },
  ]

  return <VideoViewerCanvas url={url} title={title} breadcrumbs={breadcrumbs} />
}
