// 재고조정 페이지 (품목/창고 목록을 조회해 클라이언트 폼에 전달)
import { createClient } from "@/lib/supabase/server";
import { AdjustView } from "./view";

export default async function AdjustPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: warehouses }, { data: recent }] = await Promise.all([
    supabase.from("items").select("id, item_code, name").eq("is_active", true).order("item_code"),
    supabase.from("warehouses").select("id, code, name").eq("is_active", true).order("code"),
    supabase
      .from("stock_movements")
      .select("id, movement_date, qty, memo, items(item_code, name), warehouses(name)")
      .eq("movement_type", "adjust")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return (
    <AdjustView
      items={items ?? []}
      warehouses={warehouses ?? []}
      recent={(recent ?? []).map((r) => ({
        id: r.id,
        movement_date: r.movement_date,
        qty: Number(r.qty),
        memo: r.memo,
        item: (r.items as unknown as { item_code: string; name: string } | null)?.name ?? "?",
        warehouse: (r.warehouses as unknown as { name: string } | null)?.name ?? "?",
      }))}
    />
  );
}
