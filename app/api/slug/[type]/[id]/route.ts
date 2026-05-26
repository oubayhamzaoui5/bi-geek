import PocketBase from "pocketbase";
import { NextResponse } from "next/server";

const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function generateUniqueSlug(pb: PocketBase, collection: string, title: string, currentId: string) {
  const baseSlug = slugify(title)
  let slug = baseSlug
  let counter = 1

  while (true) {
    try {
      const existing = await pb.collection(collection).getFirstListItem(`slug="${slug}"`)
      if (existing.id === currentId) return slug
      counter++
      slug = `${baseSlug}-${counter}`
    } catch {
      return slug
    }
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const pb = new PocketBase(PB_URL);
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD

    if (adminEmail && adminPassword) {
      try {
        await pb.admins.authWithPassword(adminEmail, adminPassword)
      } catch {
        // Public lookup still works when records already have slugs.
      }
    }

    const collection = type === "bootcamp" ? "bootcamps" : "courses"
    const record = await pb.collection(collection).getOne(id);

    if (!record.slug && record.title && pb.authStore.isValid) {
      const slug = await generateUniqueSlug(pb, collection, record.title, record.id)
      await pb.collection(collection).update(record.id, { slug })
      return NextResponse.json({ slug })
    }

    return NextResponse.json({ slug: record.slug || "" });
  } catch (err) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
