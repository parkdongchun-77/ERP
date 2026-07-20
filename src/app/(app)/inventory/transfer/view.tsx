// 창고이동 입력 폼 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transferStock } from "../actions";

type Option = { id: string; item_code?: string; code?: string; name: string };

export function TransferView({
  items,
  warehouses,
}: {
  items: Option[];
  warehouses: Option[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    item_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
    qty: "",
    movement_date: today,
    memo: "",
  });
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await transferStock({ ...form, qty: Number(form.qty) });
    if (error) setMessage({ type: "error", text: error });
    else {
      setMessage({ type: "info", text: "이동이 등록되었습니다." });
      setForm({ ...form, qty: "", memo: "" });
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">창고이동</h1>
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
        <div>
          <label className="mb-1 block text-xs text-gray-500">품목</label>
          <select
            required
            value={form.item_id}
            onChange={(e) => setForm({ ...form, item_id: e.target.value })}
            className="w-48 rounded border px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                [{i.item_code}] {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">출발 창고</label>
          <select
            required
            value={form.from_warehouse_id}
            onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })}
            className="w-36 rounded border px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">도착 창고</label>
          <select
            required
            value={form.to_warehouse_id}
            onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })}
            className="w-36 rounded border px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">수량</label>
          <input
            required
            type="number"
            min="0.0001"
            step="0.0001"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">일자</label>
          <input
            type="date"
            value={form.movement_date}
            onChange={(e) => setForm({ ...form, movement_date: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">메모</label>
          <input
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-48 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          이동 등록
        </button>
      </form>
    </div>
  );
}
