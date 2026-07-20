// 창고/부서/사원 등 단순 마스터의 공통 목록+폼 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/data-table";
import { saveSimpleRow, deleteSimpleRow } from "@/app/(app)/master/simple-actions";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  width?: string;
};

type Row = Record<string, unknown> & { id: string };

export function SimpleMaster({
  title,
  table,
  fields,
  rows,
}: {
  title: string;
  table: string;
  fields: FieldDef[];
  rows: Row[];
}) {
  const router = useRouter();
  const emptyForm = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await saveSimpleRow(table, form, editId ?? undefined);
    if (error) setError(error);
    else {
      setForm(emptyForm);
      setEditId(null);
      setError(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await deleteSimpleRow(table, id);
    if (error) setError(error);
    else router.refresh();
  }

  const columns: Column<Row>[] = [
    ...fields.map((f) => ({
      key: f.key,
      label: f.label,
      render: (r: Row) => {
        const v = r[f.key];
        if (f.type === "select" && f.options)
          return f.options.find((o) => o.value === v)?.label ?? String(v ?? "");
        return String(v ?? "");
      },
    })),
    {
      key: "id",
      label: "관리",
      render: (r: Row) => (
        <span className="space-x-2">
          <button
            onClick={() => {
              setEditId(r.id);
              setForm(
                Object.fromEntries(fields.map((f) => [f.key, String(r[f.key] ?? "")]))
              );
            }}
            className="text-blue-600 hover:underline"
          >
            수정
          </button>
          <button onClick={() => remove(r.id)} className="text-red-600 hover:underline">
            삭제
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">{title}</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        {editId && <span className="w-full text-xs text-blue-600">수정 중</span>}
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs text-gray-500">{f.label}</label>
            {f.type === "select" ? (
              <select
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="rounded border px-2 py-1.5 text-sm"
              >
                <option value="">선택</option>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type ?? "text"}
                required={f.required}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className={`${f.width ?? "w-32"} rounded border px-2 py-1.5 text-sm`}
              />
            )}
          </div>
        ))}
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {editId ? "수정 저장" : "등록"}
        </button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm(emptyForm);
            }}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            취소
          </button>
        )}
      </form>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}
