const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

type VideoLink = { url?: string; driveUrl?: string; title?: string; description?: string; order?: number }
type AttachmentMeta = { name: string; title?: string; description?: string; order?: number }

function toFileArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return [value as string]
}

function toVideoLinks(value: unknown): VideoLink[] {
  return Array.isArray(value) ? value : []
}

function toAttachmentMeta(value: unknown): AttachmentMeta[] {
  return Array.isArray(value) ? value : []
}

function courseAttachmentUrl(recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/course_lessons/${recordId}/${filename}`
}

function courseModuleAttachmentUrl(recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/course_modules/${recordId}/${filename}`
}

export function resolveGroupResourceMode(group: any, groupModules: any[]) {
  if (group.resourceMode === "custom") return "custom"
  if (group.resourceMode === "default") return "default"
  if (!group.course) return "custom"
  return groupModules.length > 0 ? "custom" : "default"
}

export async function readDefaultCourseResources(pb: any, courseId: string) {
  const [course, modules, lessons] = await Promise.all([
    pb.collection("courses").getOne(courseId),
    pb.collection("course_modules").getFullList({ filter: `course="${courseId}"`, sort: "order" }),
    pb.collection("course_lessons").getFullList({ filter: `course="${courseId}"`, sort: "module,order" }),
  ])

  return {
    ok: true,
    resourceMode: "default",
    course: {
      id: course.id,
      title: course.title || "",
      shortDescription: course.shortDescription || "",
    },
    modules: modules.map((m: any) => ({
      id: m.id,
      title: m.title || "",
      order: m.order ?? 0,
      description: m.description || "",
      durationLabel: m.durationLabel || m.duration || "",
      locked: !!m.locked,
    })),
    lessons: lessons.map((l: any) => ({
      id: l.id,
      slug: l.slug || l.id,
      moduleId: l.module || "",
      title: l.title || "",
      order: l.order ?? 0,
      description: l.description || "",
      content: l.content || "",
      durationLabel: l.durationLabel || l.duration || "",
      locked: !!l.locked,
    })),
    videos: lessons.flatMap((lesson: any) =>
      toVideoLinks(lesson.youtubeLinks).map((link, index) => ({
        id: `${lesson.id}:video:${index}`,
        lessonId: lesson.id,
        title: link.title || `Video ${index + 1}`,
        order: link.order ?? index,
        driveUrl: link.driveUrl || link.url || "",
        description: link.description || "",
      })),
    ),
    lessonAttachments: lessons.flatMap((lesson: any) =>
      toFileArray(lesson.attachments).map((filename, index) => {
        const meta = toAttachmentMeta(lesson.attachmentsMeta).find(item => item.name === filename)
        return {
          id: `${lesson.id}:attachment:${encodeURIComponent(filename)}`,
          lessonId: lesson.id,
          name: filename,
          title: meta?.title || filename,
          description: meta?.description || "",
          order: meta?.order ?? index,
          url: courseAttachmentUrl(lesson.id, filename),
        }
      }),
    ),
    videoAttachments: [],
    moduleVideos: modules.flatMap((module: any) =>
      toVideoLinks(module.resourceVideos).map((link, index) => ({
        id: `${module.id}:module_video:${index}`,
        moduleId: module.id,
        title: link.title || `Video ${index + 1}`,
        order: link.order ?? index,
        driveUrl: link.driveUrl || link.url || "",
        description: link.description || "",
      })),
    ),
    moduleAttachments: modules.flatMap((module: any) =>
      toFileArray(module.resourceAttachments).map((filename, index) => {
        const meta = toAttachmentMeta(module.resourceAttachmentsMeta).find(item => item.name === filename)
        return {
          id: `${module.id}:module_attachment:${encodeURIComponent(filename)}`,
          moduleId: module.id,
          name: filename,
          title: meta?.title || filename,
          description: meta?.description || "",
          order: meta?.order ?? index,
          url: courseModuleAttachmentUrl(module.id, filename),
        }
      }),
    ),
  }
}

export async function readDefaultCourseLesson(pb: any, courseId: string, lessonSlugOrId: string) {
  const resources = await readDefaultCourseResources(pb, courseId)
  const lesson = resources.lessons.find((item: any) => item.slug === lessonSlugOrId || item.id === lessonSlugOrId)
  if (!lesson) throw new Error("Lecon introuvable")

  const sortedMods = [...resources.modules].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  const module = sortedMods.find((item: any) => item.id === lesson.moduleId)
  const moduleLessons = resources.lessons
    .filter((item: any) => item.moduleId === lesson.moduleId)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

  return {
    resources,
    lesson,
    module,
    moduleIndex: module ? sortedMods.indexOf(module) + 1 : 1,
    lessonIndex: moduleLessons.findIndex((item: any) => item.id === lesson.id) + 1,
    moduleLessons,
    videos: resources.videos.filter((item: any) => item.lessonId === lesson.id),
    lessonAttachments: resources.lessonAttachments.filter((item: any) => item.lessonId === lesson.id),
  }
}
