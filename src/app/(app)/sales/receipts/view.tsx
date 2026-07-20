// 수금 등록 폼 + 미수금 현황 + 최근 수금 이력 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReceipt } from "../actions";

type Balance = {
  partner_id: string;
  partner_code: string;
  partner_name: string;
  sales_total: number;
  received_total: number;
  balance: number;
};
type Recent = {
  id: string;
  receipt_date: string;
  amount: number;
  method: string;
  memo: string | null;
  partner: string;
};

const METHOD_LABEL: Record<string, string> = {
  cash: "현금",
  transfer: "계좌이체",
  card: "카드",
  note: "어음",
};

export function ReceiptsView({ balances, recent }: { balances: Balance[]; recent: Recent[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    partner_id: "",
    receipt_date: today,
    amount: "",
    method: "transfer",
    memo: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await saveReceipt({ ...form, amount: Number(form.amount) });
    if (error) setError(error);
    else {
      setForm({ ...form, amount: "", memo: "" });
      setError(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">수금/미수금</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">거래처</label>
          <select
            required
            value={form.partner_id}
            onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
            className="w-48 rounded border px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {balances.map((b) => (
              <option key={b.partner_id} value={b.partner_id}>
                [{b.partner_code}] {b.partner_name} (잔액 {b.balance.toLocaleString()})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">수금일</label>
          <input
            type="date"
            value={form.receipt_date}
            onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">수금액</label>
          <input
            required
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-32 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">수단</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          >
            {Object.entries(METHOD_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">메모</label>
          <input
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-40 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          수금 등록
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">거래처별 미수금 현황</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">거래처</th>
              <th className="p-2 text-right">매출 합계</th>
              <th className="p-2 text-right">수금 합계</th>
              <th className="p-2 text-right">미수 잔액</th>
            </tr>
          </thead>
          <tbody>
            {balances.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-400">
                  채권 내역이 없습니다.
                </td>
              </tr>
            ) : (
              balances.map((b) => (
                <tr key={b.partner_id} className="border-b">
                  <td className="p-2">
                    [{b.partner_code}] {b.partner_name}
                  </td>
                  <td className="p-2 text-right">{b.sales_total.toLocaleString()}</td>
                  <td className="p-2 text-right">{b.received_total.toLocaleString()}</td>
                  <td
                    className={`p-2 text-right font-medium ${b.balance > 0 ? "text-red-600" : ""}`}
                  >
                    {b.balance.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">최근 수금 이력</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">수금일</th>
              <th className="p-2">거래처</th>
              <th className="p-2 text-right">금액</th>
              <th className="p-2">수단</th>
              <th className="p-2">메모</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  수금 이력이 없습니다.
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.receipt_date}</td>
                  <td className="p-2">{r.partner}</td>
                  <td className="p-2 text-right">{r.amount.toLocaleString()}</td>
                  <td className="p-2">{METHOD_LABEL[r.method] ?? r.method}</td>
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
