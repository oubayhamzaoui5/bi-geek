export function getPDFViewerUrl(courseId: string, lessonId: string, filename: string): string {
  const slug = filename.replace(/\.pdf$/i, "")
  return `/pdf-viewer/${courseId}/${lessonId}/${slug}`
}