"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Save, Trash2 } from "lucide-react";
import type { ModuleKey } from "@prisma/client";
import { SHEET_MODULES } from "@/lib/modules";
import { normalizeEmailInput, validateUserFormClient } from "@/lib/user-validation";
import { Button } from "@/components/ui/button";
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

const MODULE_LABELS: Record<string, string> = {
  PERSONEL: "Personel",
  PUANTAJ: "Puantaj",
  WHATSAPP: "WhatsApp Süreci",
  UYARI_KESINTI: "Uyarı Kesinti",
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

export function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sheetForms, setSheetForms] = useState<Record<string, { spreadsheetId: string; sheetName: string }>>({});
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
    const [usersRes, configRes] = await Promise.all([
      fetch("/api/users", { credentials: "include" }),
      fetch("/api/sheets/config", { credentials: "include" }),
    ]);
    const usersJson = await usersRes.json();
    const configJson = await configRes.json();
    if (usersRes.ok) setUsers(usersJson.users);
    if (configRes.ok) {
      const map: Record<string, { spreadsheetId: string; sheetName: string }> = {};
      for (const key of SHEET_MODULES) {
        const found = configJson.configs.find((c: { moduleKey: string }) => c.moduleKey === key);
        map[key] = {
          spreadsheetId: found?.spreadsheetId ?? "",
          sheetName: found?.sheetName ?? "Sayfa1",
        };
      }
      setSheetForms(map);
    }
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

  async function saveSheetConfig(moduleKey: ModuleKey) {
    const form = sheetForms[moduleKey];
    const res = await fetch("/api/sheets/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        moduleKey,
        spreadsheetId: form.spreadsheetId,
        sheetName: form.sheetName,
      }),
    });
    if (res.ok) {
      setMessage({ text: `${MODULE_LABELS[moduleKey]} bağlantısı kaydedildi`, type: "ok" });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Kullanıcı Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kullanıcılar ve Google Sheets bağlantıları (yalnızca admin).
        </p>
      </div>

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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="mb-4 text-lg font-semibold">Yeni Kullanıcı</h2>
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
            <Label>Şifre (en az 6 karakter)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                minLength={6}
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <h2 className="border-b border-slate-100 px-5 py-4 text-lg font-semibold">Kullanıcılar</h2>
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Google Sheets Bağlantıları</h2>
        {SHEET_MODULES.map((moduleKey) => (
          <SheetConfigCard
            key={moduleKey}
            moduleKey={moduleKey}
            label={MODULE_LABELS[moduleKey]}
            sheetForms={sheetForms}
            setSheetForms={setSheetForms}
            onSave={() => void saveSheetConfig(moduleKey)}
          />
        ))}
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

  async function save() {
    if (password && password.length < 6) {
      onMessage({ text: "Yeni şifre en az 6 karakter olmalı", type: "error" });
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role, active, ...(password ? { password } : {}) }),
    });
    const json = await res.json();
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
    const json = await res.json();
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
    const json = await res.json();
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
              minLength={6}
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

function SheetConfigCard({
  moduleKey,
  label,
  sheetForms,
  setSheetForms,
  onSave,
}: {
  moduleKey: ModuleKey;
  label: string;
  sheetForms: Record<string, { spreadsheetId: string; sheetName: string }>;
  setSheetForms: React.Dispatch<React.SetStateAction<Record<string, { spreadsheetId: string; sheetName: string }>>>;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
      <h3 className="font-medium text-slate-900">{label}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <Label>Sheet URL veya ID</Label>
          <Input
            value={sheetForms[moduleKey]?.spreadsheetId ?? ""}
            onChange={(e) =>
              setSheetForms({
                ...sheetForms,
                [moduleKey]: {
                  spreadsheetId: e.target.value,
                  sheetName: sheetForms[moduleKey]?.sheetName ?? "Sayfa1",
                },
              })
            }
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
        <div>
          <Label>Sekme Adı</Label>
          <Input
            value={sheetForms[moduleKey]?.sheetName ?? "Sayfa1"}
            onChange={(e) =>
              setSheetForms({
                ...sheetForms,
                [moduleKey]: {
                  spreadsheetId: sheetForms[moduleKey]?.spreadsheetId ?? "",
                  sheetName: e.target.value,
                },
              })
            }
            placeholder="Sayfa1 (dosyanın altındaki sekme adı)"
          />
          <p className="mt-1 text-xs text-slate-500">
            Türkçe Google Sheets’te varsayılan sekme adı genelde <strong>Sayfa1</strong> olur. Tek
            sekme varsa yanlış ad girilse bile ilk sekme otomatik kullanılır.
          </p>
        </div>
      </div>
      <Button className="mt-3" variant="secondary" onClick={onSave}>
        <Save className="h-4 w-4" />
        Kaydet
      </Button>
    </div>
  );
}
