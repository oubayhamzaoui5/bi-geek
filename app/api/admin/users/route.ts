import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

async function getAdminPB() {
  const pb = new PocketBase(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090");
  await pb.collection("_superusers").authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  );
  return pb;
}

const PB_URL = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090";

function resolveAvatar(user: any): string | null {
  if (!user.avatar) return null;
  // Already a full URL (e.g. set by avatar route)
  if (user.avatar.startsWith("http")) return user.avatar;
  return `${PB_URL}/api/files/${user.collectionId}/${user.id}/${user.avatar}`;
}

export async function GET() {
  try {
    const pb = await getAdminPB();
    const users = await pb.collection("users").getFullList({ sort: "-created" });
    return NextResponse.json(users.map(u => ({ ...u, avatar: resolveAvatar(u) })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const pb = await getAdminPB();

    const pwd = data.password || data.plainPassword;
    if (!pwd) throw new Error("Mot de passe requis.");

    const user = await pb.collection("users").create({
      username: data.username,
      name: data.name ?? "",
      surname: data.surname ?? "",
      email: data.email,
      emailVisibility: true,
      phone: data.phone ?? "",
      role: data.role ?? "student",
      tags: data.tags ?? [],
      usePassword: false,
      plainPassword: pwd,
      password: pwd,
      passwordConfirm: pwd,
    });

    return NextResponse.json({ ...user, avatar: resolveAvatar(user) });
  } catch (err: any) {
    const details = err?.data?.data || err?.data || null;
    return NextResponse.json({ error: err.message, details }, { status: err?.status || 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) throw new Error("User ID requis.");

    const pb = await getAdminPB();

    const payload: Record<string, unknown> = {
      username: data.username,
      name: data.name ?? "",
      surname: data.surname ?? "",
      email: data.email,
      emailVisibility: true,
      phone: data.phone ?? "",
      role: data.role,
      tags: data.tags ?? [],
    };

    if (typeof data.usePassword === "boolean") {
      payload.usePassword = data.usePassword;
    }

    if (typeof data.password === "string" && data.password) {
      payload.password = data.password;
      payload.passwordConfirm = data.password;
      payload.plainPassword = data.plainPassword || data.password;
    } else if (typeof data.plainPassword === "string") {
      payload.plainPassword = data.plainPassword;
    }

    const updated = await pb.collection("users").update(data.id, payload);
    return NextResponse.json({ ...updated, avatar: resolveAvatar(updated) });
  } catch (err: any) {
    const details = err?.data?.data || err?.data || null;
    return NextResponse.json({ error: err.message, details }, { status: err?.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("User ID requis.");

    const pb = await getAdminPB();
    await pb.collection("users").delete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const details = err?.data?.data || err?.data || null;
    return NextResponse.json({ error: err.message, details }, { status: err?.status || 500 });
  }
}
