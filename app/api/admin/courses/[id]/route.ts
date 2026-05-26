// app/api/admin/courses/[id]/route.ts
import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const PB_URL = process.env.POCKETBASE_URL
  const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

  if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Variables d'environnement PocketBase manquantes.")
  }

  const pb = new PocketBase(PB_URL)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  return pb
}

async function ensureArchivedField(pb: PocketBase) {
  const col = await pb.collections.getOne("courses")
  const fields: any[] = (col as any).fields ?? (col as any).schema ?? []
  if (!fields.find((f: any) => f.name === "archived")) {
    fields.push({ name: "archived", type: "bool", required: false })
    const useNewApi = Array.isArray((col as any).fields)
    try {
      await pb.collections.update("courses", useNewApi ? { fields } : { schema: fields })
    } catch (err: any) {
      const msg: string = err?.data?.message ?? err?.message ?? ""
      if (!msg.includes("duplicate column name")) throw err
    }
  }
}

type RouteParams = {
  params: Promise<{ id: string }>
}

// PATCH — archive or restore (never permanent delete)
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const { id: courseId } = await params
    const body = await req.json()

    if (body.action === "archive") {
      try { await ensureArchivedField(pb) } catch (e) { console.error("PATCH archive: ensureField failed:", e) }
      const updated = await pb.collection("courses").update(courseId, { archived: true })
      if (!updated.archived) {
        console.error("PATCH archive: PocketBase did not persist archived=true for", courseId)
        return NextResponse.json({ error: "Champ archived non persisté par PocketBase" }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    if (body.action === "restore") {
      await pb.collection("courses").update(courseId, { archived: false })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
  } catch (err: any) {
    console.error("ADMIN COURSES PATCH ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}

// DELETE — permanent only (cascade modules + lessons)
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const pb = await getAdminPb()
    const { id: courseId } = await params

    const modules = await pb.collection("course_modules").getFullList({
      filter: `course="${courseId}"`,
    })

    for (const m of modules as any[]) {
      const lessons = await pb.collection("course_lessons").getFullList({
        filter: `module="${m.id}"`,
      })
      for (const l of lessons as any[]) {
        await pb.collection("course_lessons").delete(l.id)
      }
      await pb.collection("course_modules").delete(m.id)
    }

    await pb.collection("courses").delete(courseId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("ADMIN COURSES DELETE ERROR:", err)
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
