import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const { POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD } = process.env
  if (!POCKETBASE_URL || !POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD)
    throw new Error("Variables d'environnement PocketBase manquantes.")
  const pb = new PocketBase(POCKETBASE_URL)
  await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
  return pb
}

export async function POST() {
  try {
    const pb = await getAdminPb()

    const collection = await pb.collections.getOne("bootcamps")
    const useNewApi = Array.isArray((collection as any).fields)
    const fields: any[] = (collection as any).fields ?? (collection as any).schema ?? []
    const migrations: string[] = []

    const ensureField = async (field: Record<string, unknown>, opts: Record<string, unknown> = {}) => {
      if (fields.find((f: any) => f.name === field.name)) return
      const newField = useNewApi ? { ...field, ...opts } : { ...field, options: opts }
      fields.push(newField)
      try {
        await pb.collections.update("bootcamps", useNewApi ? { fields } : { schema: fields })
        migrations.push(String(field.name))
      } catch (err: any) {
        const msg: string = err?.data?.message ?? err?.message ?? ""
        if (!msg.includes("duplicate column name")) throw err
      }
    }

    await ensureField({ name: "archived", type: "bool", required: false })
    await ensureField({ name: "tags", type: "json", required: false })

    return NextResponse.json({ ok: true, applied: migrations })
  } catch (err: any) {
    console.error("MIGRATE BOOTCAMPS ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
