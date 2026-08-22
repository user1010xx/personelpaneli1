"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { normalizeEmailInput, validateUserFormClient } from "@/lib/user-validation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Label } from "@/components/ui/input";
import { SortableTh } from "@/components/ui/sortable-th";
import { useClientTableSort } from "@/components/ui/sortable-th";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  active: boolean;
};

function generatePassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  }
  const values = new Uint32Array(length);
  cryptoObj.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "USER";
  }>({ name: "", email: "", password: "", role: "USER" });
  const [message, setMessage] = useState<{ text: string; type: "ok" | "error" } | null>(null);
  const { sortKey, sortDir, toggleSort, sort } = useClientTableSort<
    "name" | "email" | "role" | "active"
  >("name", "asc");

  const sortedUsers = useMemo(() => sort(users), [users, sort]);

  async function load() {
    const usersRes = await fetch("/api/users", { credentials: "include" });
    const usersJson = await usersRes.json();
    if (usersRes.ok) setUsers(usersJson.users);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    const clientError = validateUserFormClient(userForm);
    if (clientError) {
      setMessage({ text: clientError, type: "error" });
      return;
    }
    const payload = {
      ...userForm,
      email: normalizeEmailInput(userForm.email),
    };
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ text: json.error ?? "Kullanıcı eklenemedi", type: "error" });
      return;
    }
    setMessage({ text: "Kullanıcı eklendi", type: "ok" });
    setUserForm({ name: "", email: "", password: "", role: "USER" });
    void load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Sistem"
        title="Kullanıcı Yönetimi"
        description="Kullanıcı hesapları, roller ve erişim (yalnızca admin)."
      />

      {message ? (
        <div
          className={
            message.type === "error"
              ? "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              : "rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
          }
        >
          {message.text}
        </div>
      ) : null}

      <section className="panel-card p-5">
        <h2 className="mb-4 font-display text-base font-semibold tracking-tight text-ink-900">
          Yeni Kullanıcı
        </h2>
        <form onSubmit={createUser} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Ad Soyad</Label>
            <Input
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              minLength={2}
              required
            />
          </div>
          <div>
            <Label>E-posta</Label>
            <Input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="ornek@firma.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Label>Şifre (en az 8 karakter)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                minLength={8}
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setUserForm({ ...userForm, password: generatePassword(10) })}
              >
                Üret
              </Button>
            </div>
          </div>
          <div>
            <Label>Rol</Label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as "ADMIN" | "USER" })}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Kullanıcı Ekle</Button>
          </div>
        </form>
      </section>

      <section className="panel-card overflow-hidden">
        <h2 className="border-b border-[var(--border)] px-5 py-4 font-display text-base font-semibold tracking-tight text-ink-900">
          Kullanıcılar
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <SortableTh
                  label="Ad"
                  sortKey="name"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(k) => toggleSort(k as typeof sortKey)}
                  className="px-4 py-3 text-left"
                />
                <SortableTh
                  label="E-posta"
                  sortKey="email"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(k) => toggleSort(k as typeof sortKey)}
                  className="px-4 py-3 text-left"
                />
                <SortableTh
                  label="Rol"
                  sortKey="role"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(k) => toggleSort(k as typeof sortKey)}
                  className="px-4 py-3 text-left"
                />
                <SortableTh
                  label="Durum"
                  sortKey="active"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(k) => toggleSort(k as typeof sortKey)}
                  className="px-4 py-3 text-left"
                />
                <th className="px-4 py-3 text-left">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onMessage={setMessage}
                  onUpdated={() => void load()}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UserRow({
  user,
  onMessage,
  onUpdated,
}: {
  user: User;
  onMessage: (msg: { text: string; type: "ok" | "error" }) => void;
  onUpdated: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRole(user.role);
    setActive(user.active);
  }, [user.role, user.active]);

  async function save() {
    if (password && password.length < 8) {
      onMessage({ text: "Yeni şifre en az 8 karakter olmalı", type: "error" });
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role, active, ...(password ? { password } : {}) }),
    });
    const json = await readJson(res);
    setSaving(false);
    if (!res.ok) {
      onMessage({ text: json.error ?? "Güncelleme başarısız", type: "error" });
      return;
    }
    setPassword("");
    onMessage({ text: "Kullanıcı güncellendi", type: "ok" });
    onUpdated();
  }

  async function deactivate() {
    if (!confirm(`${user.name} pasifleştirilsin mi?`)) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await readJson(res);
    if (!res.ok) {
      onMessage({ text: json.error ?? "İşlem başarısız", type: "error" });
      return;
    }
    onMessage({ text: "Kullanıcı pasifleştirildi", type: "ok" });
    onUpdated();
  }

  async function remove() {
    if (!confirm(`${user.name} kullanıcısı kalıcı olarak silinsin mi?`)) return;
    const res = await fetch(`/api/users/${user.id}?mode=hard`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await readJson(res);
    if (!res.ok) {
      onMessage({ text: json.error ?? "Kullanıcı silinemedi", type: "error" });
      return;
    }
    onMessage({ text: "Kullanıcı silindi", type: "ok" });
    onUpdated();
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-medium">{user.name}</td>
      <td className="px-4 py-3">{user.email}</td>
      <td className="px-4 py-3">
        <select
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {active ? "Aktif" : "Pasif"}
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-[260px] gap-2">
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Yeni şifre"
              minLength={8}
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => setPassword(generatePassword(10))}>
              <KeyRound className="h-4 w-4" />
              Üret
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            Kaydet
          </Button>
          {active ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => void deactivate()}>
              Pasifleştir
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="danger" onClick={() => void remove()}>
            <Trash2 className="h-4 w-4" />
            Sil
          </Button>
        </div>
      </td>
    </tr>
  );
}
