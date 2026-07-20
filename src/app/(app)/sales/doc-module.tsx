// 견적/주문/판매 공용 문서 모듈 (목록 + 라인 편집기 + 상태별 액션)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveDoc,
  deleteDoc,
  convertQuoteToOrder,
  convertOrderToSale,
  confirmSale,
  cancelSale,
  convertPoToPurchase,
  confirmPurchase,
  cancelPurchase,
  type DocType,
  type DocLineInput,
} from "./actions";

export type Option = { id: string; label: string };
export type DocRow = {
  id: string;
  doc_no: string;
  doc_date: string;
  partner_id: string;
  partner_name: string;
  warehouse_id?: string;
  status: string;
  memo: string | null;
  total: number;
  lines: DocLineInput[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "임시저장",
  converted: "변환됨",
  confirmed: "확정",
  canceled: "취소됨",
  closed: "마감",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  converted: "bg-blue-50 text-blue-600",
  confirmed: "bg-green-50 text-green-700",
  canceled: "bg-red-50 text-red-500",
  closed: "bg-blue-50 text-blue-600",
};

const TITLE: Record<DocType, string> = {
  quote: "견적서",
  order: "주문서",
  sale: "판매(출고)",
  po: "발주서",
  purchase: "구매(입고)",
};

export function DocModule({
  docType,
  docs,
  partners,
  items,
  warehouses,
}: {
  docType: DocType;
  docs: DocRow[];
  partners: Option[];
  items: (Option & { price_out: number })[];
  warehouses?: Option[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const emptyLine = { item_id: "", qty: 1, price: 0 };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    doc_date: today,
    partner_id: "",
    warehouse_id: "",
    memo: "",
  });
  const [lines, setLines] = useState<typeof emptyLine[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setForm({ id: undefined, doc_date: today, partner_id: "", warehouse_id: "", memo: "" });
    setLines([{ ...emptyLine }]);
    setEditing(false);
    setError(null);
  }

  function startEdit(d: DocRow) {
    setForm({
      id: d.id,
      doc_date: d.doc_date,
      partner_id: d.partner_id,
      warehouse_id: d.warehouse_id ?? "",
      memo: d.memo ?? "",
    });
    setLines(d.lines.map((l) => ({ ...l })));
    setEditing(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter((l) => l.item_id && l.qty > 0);
    const { error } = await saveDoc(docType, { ...form, lines: valid });
    if (error) setError(error);
    else {
      reset();
      router.refresh();
    }
  }

  async function act(fn: (id: string) => Promise<{ error: string | null }>, id: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const { error } = await fn(id);
    if (error) setError(error);
    else router.refresh();
  }

  const total = lines.reduce((sum, l) => {
    const supply = l.qty * l.price;
    return sum + supply + Math.round(supply * 0.1);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{TITLE[docType]}</h1>
        <button
          onClick={() => (editing ? reset() : setEditing(true))}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {editing ? "닫기" : "신규 작성"}
        </button>
      </div>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {editing && (
        <form onSubmit={submit} className="space-y-4 rounded border bg-white p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">일자</label>
              <input
                type="date"
                value={form.doc_date}
                onChange={(e) => setForm({ ...form, doc_date: e.target.value })}
                className="rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">거래처</label>
              <select
                required
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                className="w-48 rounded border px-2 py-1.5 text-sm"
              >
                <option value="">선택</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {(docType === "sale" || docType === "purchase") && warehouses && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  {docType === "sale" ? "출고 창고" : "입고 창고"}
                </label>
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
            )}
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">비고</label>
              <input
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2">품목</th>
                <th className="w-24 p-2">수량</th>
                <th className="w-28 p-2">단가</th>
                <th className="w-28 p-2 text-right">공급가액</th>
                <th className="w-24 p-2 text-right">부가세</th>
                <th className="w-12 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const supply = l.qty * l.price;
                return (
                  <tr key={i} className="border-b">
                    <td className="p-1">
                      <select
                        value={l.item_id}
                        onChange={(e) => {
                          const item = items.find((it) => it.id === e.target.value);
                          const next = [...lines];
                          next[i] = { ...l, item_id: e.target.value, price: item?.price_out ?? l.price };
                          setLines(next);
                        }}
                        className="w-full rounded border px-2 py-1 text-sm"
                      >
                        <option value="">선택</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={l.qty}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i] = { ...l, qty: Number(e.target.value) };
                          setLines(next);
                        }}
                        className="w-full rounded border px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        min="0"
                        value={l.price}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i] = { ...l, price: Number(e.target.value) };
                          setLines(next);
                        }}
                        className="w-full rounded border px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="p-2 text-right">{supply.toLocaleString()}</td>
                    <td className="p-2 text-right">{Math.round(supply * 0.1).toLocaleString()}</td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => setLines(lines.filter((_, j) => j !== i))}
                        className="text-red-500 hover:underline"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLines([...lines, { ...emptyLine }])}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              + 라인 추가
            </button>
            <div className="space-x-4 text-sm">
              <span className="font-medium">합계(부가세 포함): {total.toLocaleString()}원</span>
              <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
                {form.id ? "수정 저장" : "저장"}
              </button>
            </div>
          </div>
        </form>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">문서번호</th>
            <th className="p-2">일자</th>
            <th className="p-2">거래처</th>
            <th className="p-2 text-right">합계금액</th>
            <th className="p-2">상태</th>
            <th className="p-2">관리</th>
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-400">
                작성된 {TITLE[docType]}가 없습니다.
              </td>
            </tr>
          ) : (
            docs.map((d) => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{d.doc_no}</td>
                <td className="p-2">{d.doc_date}</td>
                <td className="p-2">{d.partner_name}</td>
                <td className="p-2 text-right">{d.total.toLocaleString()}</td>
                <td className="p-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[d.status]}`}>
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                </td>
                <td className="space-x-2 p-2">
                  {d.status === "draft" && (
                    <>
                      <button onClick={() => startEdit(d)} className="text-blue-600 hover:underline">
                        수정
                      </button>
                      <button
                        onClick={() => act((id) => deleteDoc(docType, id), d.id, "삭제하시겠습니까?")}
                        className="text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                      {docType === "quote" && (
                        <button
                          onClick={() => act(convertQuoteToOrder, d.id, "주문서로 변환하시겠습니까?")}
                          className="text-green-700 hover:underline"
                        >
                          주문 변환
                        </button>
                      )}
                      {docType === "order" && (
                        <button
                          onClick={() => act(convertOrderToSale, d.id, "판매 전표로 변환하시겠습니까?")}
                          className="text-green-700 hover:underline"
                        >
                          판매 변환
                        </button>
                      )}
                      {docType === "sale" && (
                        <button
                          onClick={() =>
                            act(confirmSale, d.id, "확정하면 재고가 차감되고 수정할 수 없습니다. 확정하시겠습니까?")
                          }
                          className="text-green-700 hover:underline"
                        >
                          확정
                        </button>
                      )}
                      {docType === "po" && (
                        <button
                          onClick={() => act(convertPoToPurchase, d.id, "잔량 기준으로 구매 전표를 생성하시겠습니까?")}
                          className="text-green-700 hover:underline"
                        >
                          구매 변환
                        </button>
                      )}
                      {docType === "purchase" && (
                        <button
                          onClick={() =>
                            act(confirmPurchase, d.id, "확정하면 재고가 입고되고 수정할 수 없습니다. 확정하시겠습니까?")
                          }
                          className="text-green-700 hover:underline"
                        >
                          확정
                        </button>
                      )}
                    </>
                  )}
                  {docType === "purchase" && d.status === "confirmed" && (
                    <button
                      onClick={() => act(cancelPurchase, d.id, "취소하면 입고가 취소됩니다. 취소하시겠습니까?")}
                      className="text-red-600 hover:underline"
                    >
                      취소
                    </button>
                  )}
                  {docType === "sale" && d.status === "confirmed" && (
                    <>
                      <a
                        href={`/sales/${d.id}/print`}
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        거래명세서
                      </a>
                      <button
                        onClick={() =>
                          act(cancelSale, d.id, "취소하면 재고가 복원됩니다. 취소하시겠습니까?")
                        }
                        className="text-red-600 hover:underline"
                      >
                        취소
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
