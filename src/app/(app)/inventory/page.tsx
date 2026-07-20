// 현재고 조회 (품목×창고, 수불 이력 합계 기반)
import { createClient } from "@/lib/supabase/server";
import { CurrentStockView } from "./view";

export default async function CurrentStockPage() {
  const supabase = await createClient();
  const [{ data: stock, error }, { data: items }, { data: warehouses }] =
    await Promise.all([
      supabase.from("current_stock").select("item_id, warehouse_id, qty"),
      supabase.from("items").select("id, item_code, name, unit"),
      supabase.from("warehouses").select("id, code, name"),
    ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  const itemMap = new Map((items ?? []).map((i) => [i.id, i]));
  const whMap = new Map((warehouses ?? []).map((w) => [w.id, w]));
  const rows = (stock ?? []).map((s) => ({
    item_code: itemMap.get(s.item_id)?.item_code ?? "?",
    item_name: itemMap.get(s.item_id)?.name ?? "?",
    unit: itemMap.get(s.item_id)?.unit ?? "",
    warehouse: whMap.get(s.warehouse_id)?.name ?? "?",
    qty: Number(s.qty),
  }));

  return <CurrentStockView rows={rows} />;
}
