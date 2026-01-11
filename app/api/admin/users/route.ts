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
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("role", data.role);
    formData.append("password", data.password || "defaultPass123");

    if (data.avatar) {
      // PB expects File, you can handle upload from frontend as FormData instead of base64
      // for now we skip avatar here, handle in UsersCrud separately
    }

    const user = await pb.collection("users").create(formData);
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const formData = new FormData();

    if (!data.id) throw new Error("User ID is required");

    formData.append("username", data.username);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("role", data.role);

    // handle avatar separately in frontend
    const updated = await pb.collection("users").update(data.id, formData);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
