"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import type { AliasScope } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SortableTh, useClientTableSort } from "@/components/ui/sortable-th";

type Alias = {
  id: string;
  aliasName: string;
  canonicalName: string;
  scope: AliasScope | null;
  createdAt: string;
  updatedAt: string;
};

const MODULE_OPTIONS: { value: AliasScope | ""; label: string }[] = [
  { value: "", label: "Tüm modüller" },
  { value: "PERSONEL", label: "Personel" },
  { value: "PUANTAJ", label: "Puantaj" },
  { value: "UYE_ADEDI", label: "Üye Adedi" },
  { value: "CAGRI_SURECI", label: "Çağrı Süreci" },
  { value: "WHATSAPP", label: "WhatsApp Süreci" },
  { value: "UYARI_KESINTI", label: "Uyarı Kesinti" },
  { value: "KALITE", label: "Kalite" },
  { value: "EGITIM", label: "Eğitim" },
];

const MODULE_LABELS: Record<string, string> = {
  UYE_ADEDI: "Üye Adedi",
  CAGRI_SURECI: "Çağrı Süreci",
  WHATSAPP: "WhatsApp Süreci",
  PERSONEL: "Personel",
  PUANTAJ: "Puantaj",
  UYARI_KESINTI: "Uyarı Kesinti",
  KALITE: "Kalite",
  EGITIM: "Eğitim",
};

export function PersonelAliasPage() {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [form, setForm] = useState({
    aliasName: "",
    canonicalName: "",
    scope: "" as AliasScope | "",
  });
  const [message, setMessage] = useState<{ text: string; type: "ok" | "error" } | null>(null);
  const { sortKey, sortDir, toggleSort, sort } = useClientTableSort<
    "aliasName" | "canonicalName" | "scope"
  >("canonicalName", "asc");

  const sortedAliases = useMemo(() => sort(aliases), [aliases, sort]);

  async function load() {
    const res = await fetch("/api/personel-aliases", { credentials: "include" });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ text: json.error ?? "Eşleştirmeler yüklenemedi", type: "error" });
      return;
    }
    setAliases(json.aliases);
    setNameOptions(json.nameOptions);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/personel-aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        scope: form.scope || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ text: json.error ?? "Eşleştirme kaydedilemedi", type: "error" });
      return;
    }
    setMessage({ text: "Eşleştirme kaydedildi", type: "ok" });
    setForm({ aliasName: "", canonicalName: "", scope: "" });
    void load();
  }

  async function remove(alias: Alias) {
    if (!confirm(`${alias.aliasName} → ${alias.canonicalName} eşleştirmesi silinsin mi?`)) return;
    const res = await fetch(`/api/personel-aliases/${alias.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ text: json.error ?? "Eşleştirme silinemedi", type: "error" });
      return;
    }
    setMessage({ text: "Eşleştirme silindi", type: "ok" });
    void load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Personel Eşleştirme</h1>
        <p className="mt-1 text-sm text-slate-500">
          Farklı yazılan personel isimlerini tek gerçek personel adına bağlayın.
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
        <h2 className="mb-4 text-lg font-semibold">Yeni Eşleştirme</h2>
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-1">
            <Label>Dosyada Gelen İsimler</Label>
            <Textarea
              value={form.aliasName}
              onChange={(e) => setForm({ ...form, aliasName: e.target.value })}
              placeholder={"Örn.\nAhmett\nAhmettt"}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Birden fazla isim için her satıra bir isim yazın veya virgül kullanın.
            </p>
          </div>
          <div>
            <Label>Gerçek Personel Adı</Label>
            <Input
              list="personel-name-options"
              value={form.canonicalName}
              onChange={(e) => setForm({ ...form, canonicalName: e.target.value })}
              placeholder="Örn. Ahmet"
              required
            />
            <datalist id="personel-name-options">
              {nameOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Kapsam</Label>
            <Select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as AliasScope | "" })}
            >
              {MODULE_OPTIONS.map((option) => (
                <option key={option.value || "ALL"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit">
              <Save className="h-4 w-4" />
              Kaydet
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <h2 className="border-b border-slate-100 px-5 py-4 text-lg font-semibold">
          Kayıtlı Eşleştirmeler
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <SortableTh
                  label="Dosyada Gelen"
                  sortKey="aliasName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-4 py-3 text-left"
                />
                <SortableTh
                  label="Gerçek Personel"
                  sortKey="canonicalName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-4 py-3 text-left"
                />
                <SortableTh
                  label="Kapsam"
                  sortKey="scope"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={(key) => toggleSort(key as typeof sortKey)}
                  className="px-4 py-3 text-left"
                />
                <th className="px-4 py-3 text-left">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sortedAliases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Henüz eşleştirme yok.
                  </td>
                </tr>
              ) : (
                sortedAliases.map((alias) => (
                  <tr key={alias.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{alias.aliasName}</td>
                    <td className="px-4 py-3">{alias.canonicalName}</td>
                    <td className="px-4 py-3">
                      {alias.scope ? MODULE_LABELS[alias.scope] ?? alias.scope : "Tüm modüller"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => void remove(alias)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}