import { NextResponse } from "next/server"
import { getAdminPb } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

/*
  PocketBase collections required:
  ─ exercises              fields: group_id(text), module_id(text), title(text), description(text)
  ─ exercise_attachments   fields: exercise_id(text), name(text), file(file)
*/

const PB_FILE_URL = process.env.NEXT_PUBLIC_PB_URL || process.env.POCKETBASE_URL!

function fileUrl(collection: string, recordId: string, filename: string) {
  return `${PB_FILE_URL}/api/files/${collection}/${recordId}/${filename}`
}

async function safeList(pb: any, col: string, filter: string, sort = "created") {
  try {
    return await pb.collection(col).getFullList({ filter, sort })
  } catch {
    try {
      return await pb.collection(col).getFullList({ filter })
    } catch {
      return []
    }
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    const url = new URL(_req.url)
    const exerciceId = url.searchParams.get("exerciceId")

    if (exerciceId) {
      const ex = await pb.collection("exercises").getOne(exerciceId)
      const atts = await safeList(pb, "exercise_attachments", `exercise_id = "${exerciceId}"`)
      return NextResponse.json({
        ok: true,
        exercise: {
          id: ex.id,
          moduleId: ex.module_id || "",
          title: ex.title || "",
          description: ex.description || "",
          deadline: ex.deadline || null,
          attachments: atts.map((a: any) => ({
            id: a.id,
            name: a.name || a.file || "",
            url: a.file ? fileUrl("exercise_attachments", a.id, a.file) : null,
          })),
        },
      })
    }

    const exList: any[] = await safeList(pb, "exercises", `group_id = "${groupId}"`)

    const result = await Promise.all(exList.map(async ex => {
      const attachments = await safeList(pb, "exercise_attachments", `exercise_id = "${ex.id}"`)
      return {
        id: ex.id,
        moduleId: ex.module_id || "",
        title: ex.title || "",
        description: ex.description || "",
        deadline: ex.deadline || null,
        attachmentsCount: attachments.length,
      }
    }))

    return NextResponse.json({ ok: true, exercises: result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const pb = await getAdminPb()

    const fd = await req.formData()
    const moduleId = fd.get("moduleId") as string || ""
    const title = fd.get("title") as string || ""
    const description = fd.get("description") as string || ""
    const deadline = fd.get("deadline") as string || null

    const exercise = await pb.collection("exercises").create({
      group_id: groupId,
      module_id: moduleId,
      title,
      description,
      deadline: deadline || null,
    })

    const fileEntries = fd.getAll("files") as File[]
    let attachmentsCount = 0
    for (const file of fileEntries) {
      if (!file || !file.name) continue
      const afd = new FormData()
      afd.append("exercise_id", exercise.id)
      afd.append("name", file.name)
      afd.append("file", file)
      await pb.collection("exercise_attachments").create(afd).catch(() => {})
      attachmentsCount++
    }

    return NextResponse.json({
      ok: true,
      exercise: {
        id: exercise.id,
        moduleId,
        title,
        description,
        attachmentsCount,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const pb = await getAdminPb()
    const { id, title, description, deadline } = await req.json()
    await pb.collection("exercises").update(id, { title, description, deadline: deadline || null })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params
    const { id } = await req.json()
    const pb = await getAdminPb()

    const attachments = await safeList(pb, "exercise_attachments", `exercise_id = "${id}"`)
    for (const att of attachments) {
      await pb.collection("exercise_attachments").delete(att.id).catch(() => {})
    }
    await pb.collection("exercises").delete(id)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
