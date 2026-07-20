// 발주 대비 입고 현황 (발주 잔량 추적)
import { createClient } from "@/lib/supabase/server";

export default async function PoRemainingPage() {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: items }, { data: partners }] = await Promise.all([
    supabase.from("po_remaining").select("order_id, doc_no, partner_id, item_id, ordered_qty, received_qty, remaining_qty"),
    supabase.from("items").select("id, item_code, name"),
    supabase.from("partners").select("id, name"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  const itemMap = new Map((items ?? []).map((i) => [i.id, i]));
  const partnerMap = new Map((partners ?? []).map((p) => [p.id, p.name]));
  const list = (rows ?? []).map((r) => ({
    key: `${r.order_id}-${r.item_id}`,
    doc_no: r.doc_no,
    partner: partnerMap.get(r.partner_id) ?? "?",
    item: itemMap.get(r.item_id)
      ? `[${itemMap.get(r.item_id)!.item_code}] ${itemMap.get(r.item_id)!.name}`
      : "?",
    ordered: Number(r.ordered_qty),
    received: Number(r.received_qty),
    remaining: Number(r.remaining_qty),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">발주잔량 현황</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">발주번호</th>
            <th className="p-2">거래처</th>
            <th className="p-2">품목</th>
            <th className="p-2 text-right">발주수량</th>
            <th className="p-2 text-right">입고수량</th>
            <th className="p-2 text-right">잔량</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-400">
                발주 내역이 없습니다.
              </td>
            </tr>
          ) : (
            list.map((r) => (
              <tr key={r.key} className="border-b">
                <td className="p-2">{r.doc_no}</td>
                <td className="p-2">{r.partner}</td>
                <td className="p-2">{r.item}</td>
                <td className="p-2 text-right">{r.ordered.toLocaleString()}</td>
                <td className="p-2 text-right text-blue-700">{r.received.toLocaleString()}</td>
                <td className={`p-2 text-right font-medium ${r.remaining > 0 ? "text-red-600" : ""}`}>
                  {r.remaining.toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
