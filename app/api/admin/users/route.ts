import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { authErrorResponse, getAdminPb, requireUser } from "@/lib/server-auth";
import { instructorProfileSchema } from "@/lib/instructor-profile";

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

function canAssignRole(callerRole: string, role: string) {
  if (callerRole === "admin") return role !== "admin";
  if (callerRole === "admin_agent") return !ADMIN_ROLES.includes(role);
  return false;
}

function canManageTarget(callerRole: string, targetRole: string) {
  if (callerRole === "admin") return targetRole !== "admin";
  if (callerRole === "admin_agent") return !ADMIN_ROLES.includes(targetRole);
  return false;
}

function usernameBase(name: unknown, surname: unknown, email: unknown) {
  const fullName = [name, surname]
    .filter((part) => typeof part === "string" && part.trim())
    .join("_");
  let base = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!base && typeof email === "string" && email.includes("@")) {
    base = email
      .split("@")[0]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  return base || `user_${Date.now()}`;
}

async function generateUniqueUsername(pb: any, data: any, currentId?: string) {
  const base = usernameBase(data.name, data.surname, data.email);
  const users = await pb.collection("users").getFullList({ fields: "id,username" });
  const existing = new Set(
    users
      .filter((user: any) => user.id !== currentId)
      .map((user: any) => String(user.username || "").toLowerCase())
      .filter(Boolean)
  );

  if (!existing.has(base)) return base;

  let suffix = 2;
  let candidate = `${base}_${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
  return candidate;
}

export async function GET(req: Request) {
  try {
    await requireUser(req, ADMIN_ROLES);
    const pb = await getAdminPB();
    const { searchParams } = new URL(req.url);
    if (searchParams.get("usernamePreview") === "1") {
      const username = await generateUniqueUsername(pb, {
        name: searchParams.get("name") ?? "",
        surname: searchParams.get("surname") ?? "",
        email: searchParams.get("email") ?? "",
      }, searchParams.get("currentId") ?? undefined);
      return NextResponse.json({ username });
    }

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

    const role = data.role ?? "student";
    if (!canAssignRole(caller.role, role)) {
      return NextResponse.json({ error: "Permission refusée : vous ne pouvez pas créer ce type de compte." }, { status: 403 });
    }
    const profile = instructorProfileSchema.safeParse(role === "instructor" ? data : {});
    if (!profile.success) {
      return NextResponse.json({ error: profile.error.issues[0].message }, { status: 400 });
    }

    const pwd = data.password || data.plainPassword;
    if (!pwd) throw new Error("Mot de passe requis.");
    const username = await generateUniqueUsername(pb, data);

    const user = await pb.collection("users").create({
      username,
      name: data.name ?? "",
      surname: data.surname ?? "",
      email: data.email,
      emailVisibility: true,
      phone: data.phone ?? "",
      role,
      usePassword: false,
      plainPassword: pwd,
      password: pwd,
      passwordConfirm: pwd,
      ...profile.data,
    });

    if (data.email) {
      try {
        await sendWelcomeEmail({
          to: data.email,
          username,
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

    const target = await pb.collection("users").getOne(data.id);
    if (!canManageTarget(caller.role, target.role) || !canAssignRole(caller.role, data.role)) {
      return NextResponse.json({ error: "Permission refusée : vous ne pouvez pas modifier ce type de compte." }, { status: 403 });
    }
    const role = data.role ?? target.role;
    const profile = instructorProfileSchema.safeParse(role === "instructor" ? data : {});
    if (!profile.success) {
      return NextResponse.json({ error: profile.error.issues[0].message }, { status: 400 });
    }

    const username = await generateUniqueUsername(pb, data, data.id);
    const payload: Record<string, unknown> = {
      username,
      name: data.name ?? "",
      surname: data.surname ?? "",
      email: data.email,
      emailVisibility: true,
      phone: data.phone ?? "",
      role: data.role,
      ...profile.data,
    };
    if (role !== "instructor" && target.showOnGuestPages === true) {
      payload.showOnGuestPages = false;
    }

    if (typeof data.usePassword === "boolean") {
      payload.usePassword = data.usePassword;
    }

    const changedPassword = typeof data.password === "string" && data.password;
    if (changedPassword) {
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

    const target = await pb.collection("users").getOne(id);
    if (!canManageTarget(caller.role, target.role)) {
      return NextResponse.json({ error: "Permission refusée : vous ne pouvez pas supprimer ce type de compte." }, { status: 403 });
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
