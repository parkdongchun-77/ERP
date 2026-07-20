// 구매현황 (기간 내 확정 구매의 거래처별·품목별 집계)
import { createClient } from "@/lib/supabase/server";

function monthRange() {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
}

export default async function PurchaseSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const def = monthRange();
  const from = params.from ?? def.from;
  const to = params.to ?? def.to;

  const supabase = await createClient();
  const { data: purchases, error } = await supabase
    .from("purchases")
    .select("partners(name), purchase_lines(qty, supply_amount, vat_amount, items(item_code, name))")
    .eq("status", "confirmed")
    .gte("doc_date", from)
    .lte("doc_date", to);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  type Line = {
    qty: number;
    supply_amount: number;
    vat_amount: number;
    items: { item_code: string; name: string } | null;
  };
  const byPartner = new Map<string, number>();
  const byItem = new Map<string, { name: string; qty: number; amount: number }>();
  let grandTotal = 0;
  for (const p of purchases ?? []) {
    const partnerName = (p.partners as unknown as { name: string } | null)?.name ?? "?";
    for (const l of (p.purchase_lines as unknown as Line[]) ?? []) {
      const amount = Number(l.supply_amount) + Number(l.vat_amount);
      grandTotal += amount;
      byPartner.set(partnerName, (byPartner.get(partnerName) ?? 0) + amount);
      const key = l.items?.item_code ?? "?";
      const cur = byItem.get(key) ?? { name: l.items?.name ?? "?", qty: 0, amount: 0 };
      byItem.set(key, { name: cur.name, qty: cur.qty + Number(l.qty), amount: cur.amount + amount });
    }
  }
  const partnerRows = [...byPartner.entries()].sort((a, b) => b[1] - a[1]);
  const itemRows = [...byItem.entries()].sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">구매현황</h1>
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
        <span className="ml-4 text-sm text-gray-600">
          기간 매입 합계(부가세 포함): <b>{grandTotal.toLocaleString()}원</b>
        </span>
      </form>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">거래처별 매입</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {partnerRows.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-400">확정된 구매가 없습니다.</td>
                </tr>
              ) : (
                partnerRows.map(([name, amount]) => (
                  <tr key={name} className="border-b">
                    <td className="p-2">{name}</td>
                    <td className="p-2 text-right">{amount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">품목별 매입</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {itemRows.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-400">확정된 구매가 없습니다.</td>
                </tr>
              ) : (
                itemRows.map(([code, r]) => (
                  <tr key={code} className="border-b">
                    <td className="p-2">
                      [{code}] {r.name}
                    </td>
                    <td className="p-2 text-right">{r.qty.toLocaleString()}</td>
                    <td className="p-2 text-right">{r.amount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
