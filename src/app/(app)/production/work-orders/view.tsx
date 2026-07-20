// 작업지시 목록·생성·완료 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrder, completeWorkOrder, deleteWorkOrder } from "../actions";

type Option = { id: string; label: string };
type WoRow = {
  id: string;
  doc_no: string;
  order_date: string;
  order_qty: number;
  due_date: string | null;
  status: string;
  completed_qty: number | null;
  material_cost: number | null;
  item: string;
  warehouse: string;
};

const STATUS_LABEL: Record<string, string> = {
  ordered: "지시",
  completed: "완료",
  canceled: "취소",
};

export function WorkOrdersView({
  orders,
  products,
  warehouses,
}: {
  orders: WoRow[];
  products: Option[];
  warehouses: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    item_id: "",
    order_qty: "",
    warehouse_id: "",
    due_date: "",
    memo: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createWorkOrder({
      ...form,
      order_qty: Number(form.order_qty),
    });
    if (error) setError(error);
    else {
      setForm({ ...form, order_qty: "", memo: "" });
      setError(null);
      router.refresh();
    }
  }

  async function complete(o: WoRow) {
    const input = prompt(`완료 수량을 입력하세요 (지시 수량 ${o.order_qty})`, String(o.order_qty));
    if (!input) return;
    const { error } = await completeWorkOrder(o.id, Number(input));
    if (error) setError(error);
    else router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("작업지시를 삭제하시겠습니까?")) return;
    const { error } = await deleteWorkOrder(id);
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">작업지시</h1>
      <p className="text-sm text-gray-500">
        완료 처리 시 제품이 입고되고 BOM 소요 자재가 같은 창고에서 차감됩니다. 자재가 부족하면 완료가 거부됩니다.
      </p>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">제품(BOM 등록된 품목)</label>
          <select
            required
            value={form.item_id}
            onChange={(e) => setForm({ ...form, item_id: e.target.value })}
            className="w-56 rounded border px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">지시 수량</label>
          <input
            required
            type="number"
            min="0.0001"
            step="0.0001"
            value={form.order_qty}
            onChange={(e) => setForm({ ...form, order_qty: e.target.value })}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
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
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">납기일</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          작업지시 등록
        </button>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">지시번호</th>
            <th className="p-2">일자</th>
            <th className="p-2">제품</th>
            <th className="p-2 text-right">지시수량</th>
            <th className="p-2 text-right">완료수량</th>
            <th className="p-2 text-right">자재원가</th>
            <th className="p-2">창고</th>
            <th className="p-2">상태</th>
            <th className="p-2">관리</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-6 text-center text-gray-400">
                작업지시가 없습니다.
              </td>
            </tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="p-2">{o.doc_no}</td>
                <td className="p-2">{o.order_date}</td>
                <td className="p-2">{o.item}</td>
                <td className="p-2 text-right">{o.order_qty.toLocaleString()}</td>
                <td className="p-2 text-right">{o.completed_qty?.toLocaleString() ?? ""}</td>
                <td className="p-2 text-right">{o.material_cost?.toLocaleString() ?? ""}</td>
                <td className="p-2">{o.warehouse}</td>
                <td className="p-2">{STATUS_LABEL[o.status] ?? o.status}</td>
                <td className="space-x-2 p-2">
                  {o.status === "ordered" && (
                    <>
                      <button onClick={() => complete(o)} className="text-green-700 hover:underline">
                        완료 처리
                      </button>
                      <button onClick={() => remove(o.id)} className="text-red-600 hover:underline">
                        삭제
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
