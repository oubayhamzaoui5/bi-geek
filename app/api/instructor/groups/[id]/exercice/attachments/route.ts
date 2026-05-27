import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

function fileUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const pb = await getAdminPb()
    const fd = await req.formData()
    const exerciceId = fd.get("exerciceId") as string
    const name = fd.get("name") as string
    const file = fd.get("file") as File

    const afd = new FormData()
    afd.append("exercise_id", exerciceId)
    afd.append("name", name)
    afd.append("file", file)
    const att = await pb.collection("exercise_attachments").create(afd)

    return NextResponse.json({
      ok: true,
      attachment: {
        id: att.id,
        name: att.name || name,
        url: att.file ? fileUrl("exercise_attachments", att.id, att.file) : null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const pb = await getAdminPb()
    const { id } = await req.json()
    await pb.collection("exercise_attachments").delete(id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
