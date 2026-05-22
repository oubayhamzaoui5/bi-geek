import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { authErrorResponse, getAdminPb, requireUser } from "@/lib/server-auth";

async function getAdminPB() {
  return getAdminPb();
}

const ADMIN_ROLES = ["admin", "admin_agent"];

const PB_URL = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090";

function resolveAvatar(user: any): string | null {
  if (!user.avatar) return null;
  // Already a full URL (e.g. set by avatar route)
  if (user.avatar.startsWith("http")) return user.avatar;
  return `${PB_URL}/api/files/${user.collectionId}/${user.id}/${user.avatar}`;
}

export async function GET(req: Request) {
  try {
    await requireUser(req, ADMIN_ROLES);
    const pb = await getAdminPB();
    const users = await pb.collection("users").getFullList({ sort: "-created" });
    return NextResponse.json(users.map(u => ({ ...u, avatar: resolveAvatar(u) })));
  } catch (err: any) {
    const auth = authErrorResponse(err);
    if (auth) return auth;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const caller = await requireUser(req, ADMIN_ROLES);
    const pb = await getAdminPB();

    const callerRole = caller.role;
    if (callerRole === "admin_agent" && ADMIN_ROLES.includes(data.role)) {
      return NextResponse.json({ error: "Permission refusée : un admin agent ne peut pas créer des comptes admin." }, { status: 403 });
    }

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

    if (data.email) {
      try {
        await sendWelcomeEmail({
          to: data.email,
          username: data.username,
          password: pwd,
          name: data.name,
        });
      } catch (emailErr: any) {
        console.error("Email send failed:", emailErr.message);
      }
    }

    return NextResponse.json({ ...user, avatar: resolveAvatar(user) });
  } catch (err: any) {
    const auth = authErrorResponse(err);
    if (auth) return auth;
    const details = err?.data?.data || err?.data || null;
    return NextResponse.json({ error: err.message, details }, { status: err?.status || 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) throw new Error("User ID requis.");

    const caller = await requireUser(req, ADMIN_ROLES);
    const pb = await getAdminPB();

    const callerRole = caller.role;
    if (callerRole === "admin_agent") {
      const target = await pb.collection("users").getOne(data.id);
      if (ADMIN_ROLES.includes(target.role) || ADMIN_ROLES.includes(data.role)) {
        return NextResponse.json({ error: "Permission refusée : un admin agent ne peut pas modifier des comptes admin." }, { status: 403 });
      }
    }

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
    const auth = authErrorResponse(err);
    if (auth) return auth;
    const details = err?.data?.data || err?.data || null;
    return NextResponse.json({ error: err.message, details }, { status: err?.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("User ID requis.");

    const caller = await requireUser(req, ADMIN_ROLES);
    const pb = await getAdminPB();

    const callerRole = caller.role;
    if (callerRole === "admin_agent") {
      const target = await pb.collection("users").getOne(id);
      if (ADMIN_ROLES.includes(target.role)) {
        return NextResponse.json({ error: "Permission refusée : un admin agent ne peut pas supprimer des comptes admin." }, { status: 403 });
      }
    }

    await pb.collection("users").delete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const auth = authErrorResponse(err);
    if (auth) return auth;
    const details = err?.data?.data || err?.data || null;
    return NextResponse.json({ error: err.message, details }, { status: err?.status || 500 });
  }
}
