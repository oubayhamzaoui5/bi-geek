import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  )
  return pb
}

function toFileArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return [value as string]
}

function toAttachmentMeta(value: unknown): { name: string; title?: string; description?: string; order?: number }[] {
  return Array.isArray(value) ? value : []
}

export async function POST(req: Request) {
  try {
    const pb = await getAdminPb()
    const formData = await req.formData()
    const lessonId = formData.get("lessonId") as string
    const moduleId = formData.get("moduleId") as string
    const file = formData.get("file") as File | null
    const name = (formData.get("name") as string) || file?.name || ""

    if ((!lessonId && !moduleId) || !file) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 })
    }

    if (moduleId) {
      const module = await pb.collection("course_modules").getOne(moduleId)
      const existingFiles = toFileArray(module.resourceAttachments)
      const existingMeta = toAttachmentMeta(module.resourceAttachmentsMeta)
      const fd = new FormData()
      fd.append("resourceAttachments+", file)
      fd.append("resourceAttachmentsMeta", JSON.stringify([
        ...existingMeta,
        { name, title: name.replace(/\.[^.]+$/, ""), description: "", order: existingFiles.length },
      ]))

      const pbUrl = process.env.POCKETBASE_URL!
      const res = await fetch(`${pbUrl}/api/collections/course_modules/records/${moduleId}`, {
        method: "PATCH",
        headers: { Authorization: pb.authStore.token },
        body: fd,
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated?.message || "Erreur upload")

      const files = toFileArray(updated.resourceAttachments)
      const uploadedName = files.find(filename => filename.includes(name.replace(/\.[^.]+$/, ""))) || files[files.length - 1] || name

      return NextResponse.json({
        ok: true,
        attachment: {
          id: `${moduleId}:module_attachment:${encodeURIComponent(uploadedName)}`,
          moduleId,
          name: uploadedName,
          url: `${PB_FILE_URL}/api/files/course_modules/${moduleId}/${uploadedName}`,
          order: files.length - 1,
        },
      })
    }

    const lesson = await pb.collection("course_lessons").getOne(lessonId)
    const existingFiles = toFileArray(lesson.attachments)
    const existingMeta = toAttachmentMeta(lesson.attachmentsMeta)

    const fd = new FormData()
    fd.append("attachments+", file)
    fd.append("attachmentsMeta", JSON.stringify([
      ...existingMeta,
      {
        name,
        title: name.replace(/\.[^.]+$/, ""),
        description: "",
        order: existingFiles.length,
      },
    ]))

    const pbUrl = process.env.POCKETBASE_URL!
    const res = await fetch(`${pbUrl}/api/collections/course_lessons/records/${lessonId}`, {
      method: "PATCH",
      headers: { Authorization: pb.authStore.token },
      body: fd,
    })
    const updated = await res.json()
    if (!res.ok) throw new Error(updated?.message || "Erreur upload")

    const files = toFileArray(updated.attachments)
    const uploadedName = files.find(filename => filename.includes(name.replace(/\.[^.]+$/, ""))) || files[files.length - 1] || name

    return NextResponse.json({
      ok: true,
      attachment: {
        id: `${lessonId}:attachment:${encodeURIComponent(uploadedName)}`,
        lessonId,
        name: uploadedName,
        url: `${PB_FILE_URL}/api/files/course_lessons/${lessonId}/${uploadedName}`,
        order: files.length - 1,
      },
    })
  } catch (err: any) {
    console.error("ADMIN COURSE RESOURCE ATTACHMENT POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
