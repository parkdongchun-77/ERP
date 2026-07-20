// 소요량 조회(간이 MRP): 다단계 BOM 전개 결과와 현재고를 비교해 부족분 계산
import { createClient } from "@/lib/supabase/server";

export default async function MrpPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; qty?: string }>;
}) {
  const params = await searchParams;
  const itemId = params.item ?? "";
  const qty = Number(params.qty ?? 0);

  const supabase = await createClient();
  const { data: boms } = await supabase
    .from("boms")
    .select("product_item_id, items!boms_product_item_id_fkey(item_code, name)");

  type Req = { material_item_id: string; total_qty: number };
  let rows: { item: string; unit: string; required: number; stock: number; shortage: number }[] = [];

  if (itemId && qty > 0) {
    const [{ data: reqs }, { data: items }, { data: stock }] = await Promise.all([
      supabase.rpc("bom_requirements", { p_item: itemId, p_qty: qty }),
      supabase.from("items").select("id, item_code, name, unit"),
      supabase.from("current_stock").select("item_id, qty"),
    ]);
    const itemMap = new Map((items ?? []).map((i) => [i.id, i]));
    const totals = new Map<string, number>();
    for (const s of stock ?? []) totals.set(s.item_id, (totals.get(s.item_id) ?? 0) + Number(s.qty));
    rows = ((reqs ?? []) as Req[]).map((r) => {
      const item = itemMap.get(r.material_item_id);
      const required = Number(r.total_qty);
      const have = totals.get(r.material_item_id) ?? 0;
      return {
        item: item ? `[${item.item_code}] ${item.name}` : "?",
        unit: item?.unit ?? "",
        required,
        stock: have,
        shortage: Math.max(0, required - have),
      };
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">소요량 조회 (MRP)</h1>
      <p className="text-sm text-gray-500">
        다단계 BOM을 전개해 최종 자재 소요량을 계산하고 현재고와 비교합니다.
      </p>
      <form className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">제품</label>
          <select name="item" defaultValue={itemId} className="w-56 rounded border px-2 py-1.5 text-sm">
            <option value="">선택</option>
            {(boms ?? []).map((b) => {
              const item = b.items as unknown as { item_code: string; name: string } | null;
              return (
                <option key={b.product_item_id} value={b.product_item_id}>
                  {item ? `[${item.item_code}] ${item.name}` : "?"}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">생산 수량</label>
          <input
            type="number"
            name="qty"
            min="1"
            defaultValue={qty || ""}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          계산
        </button>
      </form>

      {rows.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">자재</th>
              <th className="p-2 text-right">소요량</th>
              <th className="p-2 text-right">현재고</th>
              <th className="p-2 text-right">부족분</th>
              <th className="p-2">단위</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item} className="border-b">
                <td className="p-2">{r.item}</td>
                <td className="p-2 text-right">{r.required.toLocaleString()}</td>
                <td className="p-2 text-right">{r.stock.toLocaleString()}</td>
                <td className={`p-2 text-right font-medium ${r.shortage > 0 ? "text-red-600" : "text-green-700"}`}>
                  {r.shortage > 0 ? r.shortage.toLocaleString() : "충분"}
                </td>
                <td className="p-2">{r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
