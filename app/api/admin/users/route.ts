import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090"); // your PB URL

export async function GET() {
  try {
    const users = await pb.collection("users").getFullList({ sort: "-created" });
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const formData = new FormData();

    formData.append("username", data.username);
    if (typeof data.name === "string") formData.append("name", data.name);
    if (typeof data.surname === "string") formData.append("surname", data.surname);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("role", data.role);
    if (typeof data.usePassword === "boolean") {
      formData.append("usePassword", String(data.usePassword));
    } else {
      formData.append("usePassword", "false");
    }
    // Note: PB auth "verified" is managed by PB. Avoid setting it here to prevent validation errors.
    const pwd = data.password || data.plainPassword || "defaultPass123";
    formData.append("password", pwd);
    formData.append("passwordConfirm", pwd);
    formData.append("plainPassword", data.plainPassword || pwd);

    if (data.avatar) {
      // PB expects File, you can handle upload from frontend as FormData instead of base64
      // for now we skip avatar here, handle in UsersCrud separately
    }

    const user = await pb.collection("users").create(formData);
    return NextResponse.json(user);
  } catch (err: any) {
    const details =
      err?.data?.data ||
      err?.response?.data ||
      err?.data ||
      null;
    return NextResponse.json(
      { error: err.message, details },
      { status: err?.status || 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const formData = new FormData();

    if (!data.id) throw new Error("User ID is required");

    formData.append("username", data.username);
    if (typeof data.name === "string") formData.append("name", data.name);
    if (typeof data.surname === "string") formData.append("surname", data.surname);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("role", data.role);
    if (typeof data.usePassword === "boolean") {
      formData.append("usePassword", String(data.usePassword));
    }
    // Note: PB auth "verified" is managed by PB. Avoid setting it here to prevent validation errors.

    if (typeof data.password === "string" && data.password) {
      formData.append("password", data.password);
      formData.append("passwordConfirm", data.password);
      formData.append("plainPassword", data.plainPassword || data.password);
    } else if (typeof data.plainPassword === "string") {
      formData.append("plainPassword", data.plainPassword);
    }

    // handle avatar separately in frontend
    const updated = await pb.collection("users").update(data.id, formData);
    return NextResponse.json(updated);
  } catch (err: any) {
    const details =
      err?.data?.data ||
      err?.response?.data ||
      err?.data ||
      null;
    return NextResponse.json(
      { error: err.message, details },
      { status: err?.status || 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("User ID is required");

    await pb.collection("users").delete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const details =
      err?.data?.data ||
      err?.response?.data ||
      err?.data ||
      null;
    return NextResponse.json(
      { error: err.message, details },
      { status: err?.status || 500 }
    );
  }
}
