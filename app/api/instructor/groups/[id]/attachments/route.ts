import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

// POST: upload a file attachment to a lesson or video
// FormData: { type: "lesson" | "video", parentId: string, name?: string, file: File }
export async function POST(req: Request) {
  try {
    const pb = await getAdminPb()
    const formData = await req.formData()

    const type = formData.get("type") as string
    const parentId = formData.get("parentId") as string
    const name = (formData.get("name") as string) || ""
    const file = formData.get("file") as File | null

    if (!file || !parentId || !type) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    const isLesson = type === "lesson"
    const collection = isLesson ? "lesson_attachments" : "video_attachments"
    const parentField = isLesson ? "lesson_id" : "video_id"

    const pbForm = new FormData()
    pbForm.append(parentField, parentId)
    pbForm.append("name", name || file.name)
    pbForm.append("file", file)

    const record = await pb.collection(collection).create(pbForm)

    return NextResponse.json({
      ok: true,
      attachment: {
        id: record.id,
        name: record.name || file.name,
        url: `${PB_FILE_URL}/api/files/${collection}/${record.id}/${record.file}`,
        ...(isLesson ? { lessonId: record.lesson_id } : { videoId: record.video_id }),
      },
    })
  } catch (err: any) {
    console.error("ATTACHMENT POST ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: remove an attachment
// body: { type: "lesson_attachment" | "video_attachment", id: string }
export async function DELETE(req: Request) {
  try {
    const pb = await getAdminPb()
    const { type, id } = await req.json()
    const collection = type === "lesson_attachment" ? "lesson_attachments" : "video_attachments"
    await pb.collection(collection).delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ATTACHMENT DELETE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
