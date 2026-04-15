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
    const schema: any[] = collection.schema ?? []

    const migrations: string[] = []

    // Add `archived` bool field if missing
    if (!schema.find((f: any) => f.name === "archived")) {
      schema.push({ name: "archived", type: "bool", required: false, options: {} })
      migrations.push("archived")
    }

    // Add `tags` json field if missing
    if (!schema.find((f: any) => f.name === "tags")) {
      schema.push({ name: "tags", type: "json", required: false, options: {} })
      migrations.push("tags")
    }

    if (migrations.length > 0) {
      await pb.collections.update("bootcamps", { schema })
    }

    return NextResponse.json({ ok: true, applied: migrations })
  } catch (err: any) {
    console.error("MIGRATE BOOTCAMPS ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
