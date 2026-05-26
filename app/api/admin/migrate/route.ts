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

// PocketBase v0.22+ uses `fields`; older versions use `schema`. Support both.
function getFields(collection: any): any[] {
  return collection.fields ?? collection.schema ?? []
}

function buildField(useNewApi: boolean, base: Record<string, unknown>, opts: Record<string, unknown> = {}) {
  if (useNewApi) return { ...base, ...opts }
  return { ...base, options: opts }
}

async function ensureField(
  pb: PocketBase,
  collectionName: string,
  base: Record<string, unknown>,
  opts: Record<string, unknown>,
  migrations: string[],
) {
  const collection = await pb.collections.getOne(collectionName)
  const useNewApi = Array.isArray((collection as any).fields)
  const fields = getFields(collection)
  if (fields.find((f: any) => f.name === base.name)) return
  fields.push(buildField(useNewApi, base, opts))
  try {
    await pb.collections.update(collectionName, useNewApi ? { fields } : { schema: fields })
    migrations.push(`${collectionName}.${String(base.name)}`)
  } catch (err: any) {
    const msg: string = err?.data?.message ?? err?.message ?? ""
    // Column already exists at DB level (schema/DB desync from prior partial migration) — safe to ignore
    if (msg.includes("duplicate column name")) return
    throw err
  }
}

async function ensureFieldOption(
  pb: PocketBase,
  collectionName: string,
  fieldName: string,
  patch: Record<string, unknown>,
  migrations: string[],
) {
  const collection = await pb.collections.getOne(collectionName)
  const useNewApi = Array.isArray((collection as any).fields)
  const fields = getFields(collection)
  const field = fields.find((f: any) => f.name === fieldName)
  if (!field) return
  const target = useNewApi ? field : (field.options ??= {})
  let changed = false
  for (const [key, value] of Object.entries(patch)) {
    if ((target as any)[key] !== value) {
      ;(target as any)[key] = value
      changed = true
    }
  }
  if (!changed) return
  await pb.collections.update(collectionName, useNewApi ? { fields } : { schema: fields })
  migrations.push(`${collectionName}.${fieldName}`)
}

export async function POST() {
  try {
    const pb = await getAdminPb()
    const migrations: string[] = []

    await ensureField(pb, "courses", { name: "archived", type: "bool", required: false }, {}, migrations)

    await ensureField(
      pb,
      "groups",
      { name: "resourceMode", type: "select", required: false },
      { maxSelect: 1, values: ["default", "custom"] },
      migrations,
    )
    await ensureField(pb, "groups", { name: "instructor", type: "relation", required: false }, { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: 0, maxSelect: 20 }, migrations)
    await ensureFieldOption(pb, "groups", "instructor", { maxSelect: 20 }, migrations)

    await ensureField(pb, "course_modules", { name: "resourceVideos", type: "json", required: false }, {}, migrations)
    await ensureField(
      pb,
      "course_modules",
      { name: "resourceAttachments", type: "file", required: false },
      { maxSelect: 99, maxSize: 52428800, mimeTypes: [] },
      migrations,
    )
    await ensureField(pb, "course_modules", { name: "resourceAttachmentsMeta", type: "json", required: false }, {}, migrations)
    for (const collectionName of ["group_modules", "group_lessons", "lesson_videos", "lesson_attachments", "video_attachments", "module_videos", "module_attachments"]) {
      await ensureField(pb, collectionName, { name: "instructor_id", type: "text", required: false }, {}, migrations)
    }
    await ensureField(pb, "lesson_videos", { name: "order", type: "number", required: false }, { min: null, max: null, onlyInt: false }, migrations)
    await ensureField(pb, "lesson_attachments", { name: "order", type: "number", required: false }, { min: null, max: null, onlyInt: false }, migrations)
    await ensureField(pb, "video_attachments", { name: "order", type: "number", required: false }, { min: null, max: null, onlyInt: false }, migrations)

    return NextResponse.json({ ok: true, applied: migrations })
  } catch (err: any) {
    console.error("MIGRATE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
