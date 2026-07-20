// 품목 목록·등록·수정·삭제·엑셀 업로드 클라이언트 뷰
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { DataTable, type Column } from "@/components/data-table";
import { saveItem, deleteItem, bulkCreateItems, type ItemInput } from "./actions";

export type ItemRow = {
  id: string;
  item_code: string;
  name: string;
  spec: string | null;
  unit: string;
  item_type: string;
  price_in: number;
  price_out: number;
  safety_stock: number;
  is_active: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  raw: "원자재",
  sub: "부자재",
  semi: "반제품",
  product: "제품",
  goods: "상품",
};

const EMPTY = { item_code: "", name: "", spec: "", unit: "EA", item_type: "goods", price_in: 0, price_out: 0, safety_stock: 0 };

export function ItemsView({ rows }: { rows: ItemRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await saveItem({
      ...form,
      price_in: Number(form.price_in),
      price_out: Number(form.price_out),
      safety_stock: Number(form.safety_stock),
    });
    if (error) setMessage({ type: "error", text: error });
    else {
      setForm(EMPTY);
      setMessage(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await deleteItem(id);
    if (error) setMessage({ type: "error", text: error });
    else router.refresh();
  }

  async function uploadExcel(file: File) {
    const wb = XLSX.read(await file.arrayBuffer());
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const rowsToInsert: ItemInput[] = parsed.map((r) => ({
      item_code: String(r["품목코드"] ?? "").trim(),
      name: String(r["품목명"] ?? "").trim(),
      spec: r["규격"] ? String(r["규격"]) : undefined,
      unit: r["단위"] ? String(r["단위"]) : "EA",
      item_type:
        Object.entries(TYPE_LABEL).find(([, v]) => v === String(r["품목구분"] ?? ""))?.[0] ?? "goods",
      price_in: Number(r["입고단가"] ?? 0),
      price_out: Number(r["출고단가"] ?? 0),
    }));
    const result = await bulkCreateItems(rowsToInsert);
    const failText = result.failures.length
      ? ` / 실패 ${result.failures.length}건: ` +
        result.failures.map((f) => `${f.row}행(${f.reason})`).join(", ")
      : "";
    setMessage({
      type: result.failures.length ? "error" : "info",
      text: `업로드 완료: 성공 ${result.success}건${failText}`,
    });
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  const columns: Column<ItemRow>[] = [
    { key: "item_code", label: "품목코드" },
    { key: "name", label: "품목명" },
    { key: "spec", label: "규격" },
    { key: "unit", label: "단위" },
    { key: "item_type", label: "구분", render: (r) => TYPE_LABEL[r.item_type] ?? r.item_type },
    { key: "price_in", label: "입고단가", render: (r) => r.price_in.toLocaleString() },
    { key: "price_out", label: "출고단가", render: (r) => r.price_out.toLocaleString() },
    {
      key: "id",
      label: "관리",
      render: (r) => (
        <span className="space-x-2">
          <button
            onClick={() => setForm({ ...r, spec: r.spec ?? "" })}
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">품목</h1>
        <label className="cursor-pointer rounded border px-3 py-2 text-sm hover:bg-gray-50">
          엑셀 업로드
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadExcel(e.target.files[0])}
          />
        </label>
      </div>
      <p className="text-xs text-gray-400">
        엑셀 헤더: 품목코드(필수), 품목명(필수), 규격, 단위, 품목구분(원자재/부자재/반제품/제품/상품), 입고단가, 출고단가
      </p>
      {message && (
        <p
          className={`rounded p-2 text-sm ${
            message.type === "error" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        {form.id && <span className="w-full text-xs text-blue-600">수정 중: {form.item_code}</span>}
        <Field label="품목코드">
          <input
            required
            value={form.item_code}
            onChange={(e) => setForm({ ...form, item_code: e.target.value })}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="품목명">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-40 rounded border px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="규격">
          <input
            value={form.spec}
            onChange={(e) => setForm({ ...form, spec: e.target.value })}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="단위">
          <input
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="w-16 rounded border px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="구분">
          <select
            value={form.item_type}
            onChange={(e) => setForm({ ...form, item_type: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="입고단가">
          <input
            type="number"
            value={form.price_in}
            onChange={(e) => setForm({ ...form, price_in: Number(e.target.value) })}
            className="w-24 rounded border px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="출고단가">
          <input
            type="number"
            value={form.price_out}
            onChange={(e) => setForm({ ...form, price_out: Number(e.target.value) })}
            className="w-24 rounded border px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="안전재고">
          <input
            type="number"
            min="0"
            value={form.safety_stock}
            onChange={(e) => setForm({ ...form, safety_stock: Number(e.target.value) })}
            className="w-24 rounded border px-2 py-1.5 text-sm"
          />
        </Field>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {form.id ? "수정 저장" : "등록"}
        </button>
        {form.id && (
          <button
            type="button"
            onClick={() => setForm(EMPTY)}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            취소
          </button>
        )}
      </form>

      <DataTable columns={columns} rows={rows} searchPlaceholder="품목코드/품목명 검색" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      {children}
    </div>
  );
}
