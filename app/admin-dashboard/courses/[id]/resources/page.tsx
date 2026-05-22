import CourseResourcesManager from "@/components/admin/CourseResourcesManager"

export default async function AdminCourseResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CourseResourcesManager courseId={id} />
}
