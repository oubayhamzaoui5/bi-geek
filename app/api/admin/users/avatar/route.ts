import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

async function getAdminPB() {
  const pb = new PocketBase(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090");
  await pb.collection("_superusers").authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  );
  return pb;
}

export async function POST(req: Request) {
  try {
    const caller = await requireUser(req, ["admin", "admin_agent"]);
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const file = formData.get("avatar") as File | null;

    if (!id) throw new Error("User ID requis.");
    if (!file) throw new Error("Fichier avatar requis.");

    const pb = await getAdminPB();
    const target = await pb.collection("users").getOne(id);
    if (
      (caller.role === "admin" && target.role === "admin") ||
      (caller.role === "admin_agent" && ["admin", "admin_agent"].includes(target.role))
    ) {
      return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
    }

    const fd = new FormData();
    fd.append("avatar", file);

    const updated = await pb.collection("users").update(id, fd);

    // Build the public avatar URL
    const avatarUrl = updated.avatar
      ? `${process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090"}/api/files/${updated.collectionId}/${updated.id}/${updated.avatar}`
      : null;

    return NextResponse.json({ avatar: avatarUrl });
  } catch (err: any) {
    const auth = authErrorResponse(err);
    if (auth) return auth;
    return NextResponse.json({ error: err.message }, { status: err?.status || 500 });
  }
}
