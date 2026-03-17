import { Metadata } from 'next'
import PDFViewerClient from './PDFViewerClient'

interface PageProps {
  params: Promise<{
    courseId: string
    lessonId: string
    filename: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { filename } = await params
  const displayName = filename.replace(/[-_]/g, ' ').replace(/\.pdf$/i, '')
  return {
    title: `${displayName} — PDF Viewer`,
  }
}

export default async function PDFViewerPage({ params }: PageProps) {
  const { lessonId, filename } = await params

  const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL
  if (!POCKETBASE_URL) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f0f] text-white">
        <div className="text-center space-y-2">
          <div className="text-red-400 text-lg">Missing configuration</div>
          <div className="text-white/60 text-sm">
            NEXT_PUBLIC_POCKETBASE_URL is not set.
          </div>
        </div>
      </div>
    )
  }

  const normalizedFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  const pdfUrl = `${POCKETBASE_URL}/api/files/course_lessons/${lessonId}/${normalizedFilename}`

  return (
    <PDFViewerClient
      pdfUrl={pdfUrl}
      filename={filename}
    />
  )
}
