import VideoViewerCanvas from "@/components/video/VideoViewerCanvas"
import { BreadcrumbItem } from "@/components/video/VideoViewerCanvas"

export default async function InstructorVideoViewerPage({
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
    { label: "Accueil",  href: "/instructor-dashboard/overview" },
    { label: "Formations",  href: "/instructor-dashboard/groups" },
    { label: groupTitle, href: `/instructor-dashboard/groups/${slug}` },
    { label: title },
  ]

  return <VideoViewerCanvas url={url} title={title} breadcrumbs={breadcrumbs} />
}
