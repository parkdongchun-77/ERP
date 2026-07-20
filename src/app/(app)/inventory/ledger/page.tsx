// 재고수불부: 기간 조회 시 기초+입고−출고=기말 보고서
import { createClient } from "@/lib/supabase/server";

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(now) };
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const def = monthRange();
  const from = params.from ?? def.from;
  const to = params.to ?? def.to;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stock_ledger", {
    p_from: from,
    p_to: to,
  });
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  type LedgerRow = {
    item_id: string;
    item_code: string;
    item_name: string;
    unit: string;
    opening: number;
    in_qty: number;
    out_qty: number;
    closing: number;
  };
  const rows = (data ?? []) as LedgerRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">재고수불부</h1>
      <form className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">시작일</label>
          <input type="date" name="from" defaultValue={from} className="rounded border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">종료일</label>
          <input type="date" name="to" defaultValue={to} className="rounded border px-2 py-1.5 text-sm" />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          조회
        </button>
      </form>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">품목코드</th>
            <th className="p-2">품목명</th>
            <th className="p-2 text-right">기초재고</th>
            <th className="p-2 text-right">입고</th>
            <th className="p-2 text-right">출고</th>
            <th className="p-2 text-right">기말재고</th>
            <th className="p-2">단위</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-400">
                해당 기간의 수불 내역이 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.item_id} className="border-b">
                <td className="p-2">{r.item_code}</td>
                <td className="p-2">{r.item_name}</td>
                <td className="p-2 text-right">{Number(r.opening).toLocaleString()}</td>
                <td className="p-2 text-right text-blue-700">{Number(r.in_qty).toLocaleString()}</td>
                <td className="p-2 text-right text-red-700">{Number(r.out_qty).toLocaleString()}</td>
                <td className="p-2 text-right font-medium">{Number(r.closing).toLocaleString()}</td>
                <td className="p-2">{r.unit}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
