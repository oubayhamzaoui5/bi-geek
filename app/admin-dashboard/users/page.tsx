"use client";

import { useEffect, useState } from "react";
import UsersCrud, { AdminUser } from "@/components/admin/UsersCrud";
import LoadingBI from "@/components/LoadingBI";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const u = raw ? JSON.parse(raw) : null
      if (u?.id) setCurrentUser({ id: u.id, role: u.role ?? "admin" })
    } catch { /* ignore */ }
  }, [])

  // GET users
  useEffect(() => {
  const controller = new AbortController();
  const signal = controller.signal;

  const fetchUsers = async () => {
    const start = Date.now();

    try {
      const res = await fetch("/api/admin/users", { signal });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors du chargement des utilisateurs");
      setUsers(data || []);
    } catch (err: any) {
      if (err.name === "AbortError") return; // Ignore cancelled requests
      console.error(err);
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(500 - elapsed, 0);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  fetchUsers();

  return () => controller.abort(); // cancel on unmount
}, []);


  // POST / UPDATE (+ avatar)
  const handleSave = async (user: AdminUser, avatarFile?: File) => {
    const method = user.id ? "PATCH" : "POST";
    const res = await fetch("/api/admin/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, callerId: currentUser?.id }),
    });

    const saved = await res.json();

    if (!res.ok || !saved?.id) {
      throw new Error(saved?.error || "Erreur lors de l'enregistrement de l'utilisateur");
    }

    if (avatarFile) {
      const fd = new FormData();
      fd.append("id", saved.id!);
      fd.append("avatar", avatarFile);

      const avatarRes = await fetch("/api/admin/users/avatar", {
        method: "POST",
        body: fd,
      });

      const avatarData = await avatarRes.json();
      saved.avatar = avatarData.avatar;
    }

    setUsers(prev =>
      prev.some(u => u.id === saved.id)
        ? prev.map(u => (u.id === saved.id ? saved : u))
        : [...prev, saved]
    );
    return saved;
  };

  // DELETE
  const handleDelete = async (id: string) => {
    const callerParam = currentUser?.id ? `&callerId=${currentUser.id}` : "";
    await fetch(`/api/admin/users?id=${id}${callerParam}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  if (loading) {
    return <LoadingBI />;
  }

  return (
    <>
      <UsersCrud
        initialUsers={users}
        onSave={handleSave}
        onDelete={handleDelete}
        currentUserRole={currentUser?.role}
      />
    </>
  );
}
