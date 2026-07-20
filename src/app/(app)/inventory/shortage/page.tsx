// 안전재고 부족 품목 조회 (품목별 전체 현재고가 안전재고 미만인 목록)
import { createClient } from "@/lib/supabase/server";

export default async function ShortagePage() {
  const supabase = await createClient();
  const [{ data: items, error }, { data: stock }] = await Promise.all([
    supabase
      .from("items")
      .select("id, item_code, name, unit, safety_stock")
      .gt("safety_stock", 0)
      .eq("is_active", true)
      .order("item_code"),
    supabase.from("current_stock").select("item_id, qty"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  const totals = new Map<string, number>();
  for (const s of stock ?? []) {
    totals.set(s.item_id, (totals.get(s.item_id) ?? 0) + Number(s.qty));
  }
  const rows = (items ?? [])
    .map((i) => ({
      ...i,
      current: totals.get(i.id) ?? 0,
      shortage: Number(i.safety_stock) - (totals.get(i.id) ?? 0),
    }))
    .filter((r) => r.shortage > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">안전재고 부족</h1>
      <p className="text-sm text-gray-500">
        안전재고가 설정된 품목 중 전체 현재고가 안전재고보다 적은 품목입니다. 안전재고는 품목 마스터에서 설정하세요.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">품목코드</th>
            <th className="p-2">품목명</th>
            <th className="p-2 text-right">안전재고</th>
            <th className="p-2 text-right">현재고</th>
            <th className="p-2 text-right">부족수량</th>
            <th className="p-2">단위</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-400">
                부족한 품목이 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.item_code}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-right">{Number(r.safety_stock).toLocaleString()}</td>
                <td className="p-2 text-right">{r.current.toLocaleString()}</td>
                <td className="p-2 text-right font-medium text-red-600">
                  {r.shortage.toLocaleString()}
                </td>
                <td className="p-2">{r.unit}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
