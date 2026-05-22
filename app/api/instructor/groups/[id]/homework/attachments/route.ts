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

export async function POST(req: Request) {
  try {
    const pb = await getAdminPb()
    const formData = await req.formData()
    const homeworkId = formData.get("homeworkId") as string
    const name = (formData.get("name") as string) || ""
    const file = formData.get("file") as File | null

    if (!file || !homeworkId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    const pbForm = new FormData()
    pbForm.append("homework_id", homeworkId)
    pbForm.append("name", name || file.name)
    pbForm.append("file", file)

    const record = await pb.collection("homework_attachments").create(pbForm)

    return NextResponse.json({
      ok: true,
      attachment: {
        id: record.id,
        homeworkId: record.homework_id,
        name: record.name || file.name,
        url: `${PB_FILE_URL}/api/files/homework_attachments/${record.id}/${record.file}`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const pb = await getAdminPb()
    const { id } = await req.json()
    await pb.collection("homework_attachments").delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
