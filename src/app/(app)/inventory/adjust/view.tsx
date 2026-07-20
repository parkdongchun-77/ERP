// 재고조정 입력 폼과 최근 조정 이력 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "../actions";

type Option = { id: string; item_code?: string; code?: string; name: string };
type RecentRow = {
  id: string;
  movement_date: string;
  qty: number;
  memo: string | null;
  item: string;
  warehouse: string;
};

export function AdjustView({
  items,
  warehouses,
  recent,
}: {
  items: Option[];
  warehouses: Option[];
  recent: RecentRow[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    item_id: "",
    warehouse_id: "",
    qty: "",
    movement_date: today,
    memo: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await adjustStock({
      ...form,
      qty: Number(form.qty),
    });
    if (error) setError(error);
    else {
      setForm({ ...form, qty: "", memo: "" });
      setError(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">재고조정</h1>
      <p className="text-sm text-gray-500">
        실사 차이나 기초재고 등록에 사용합니다. 증가는 양수, 감소는 음수로 입력하세요.
      </p>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
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
          <label className="mb-1 block text-xs text-gray-500">창고</label>
          <select
            required
            value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
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
          <label className="mb-1 block text-xs text-gray-500">조정수량(±)</label>
          <input
            required
            type="number"
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
          <label className="mb-1 block text-xs text-gray-500">사유</label>
          <input
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-48 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          조정 등록
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">최근 조정 이력</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">일자</th>
              <th className="p-2">품목</th>
              <th className="p-2">창고</th>
              <th className="p-2 text-right">수량</th>
              <th className="p-2">사유</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  조정 이력이 없습니다.
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.movement_date}</td>
                  <td className="p-2">{r.item}</td>
                  <td className="p-2">{r.warehouse}</td>
                  <td className={`p-2 text-right ${r.qty < 0 ? "text-red-600" : "text-blue-700"}`}>
                    {r.qty.toLocaleString()}
                  </td>
                  <td className="p-2 text-gray-500">{r.memo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
