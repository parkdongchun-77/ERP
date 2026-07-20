// 품목 목록 페이지 (서버에서 조회 후 클라이언트 뷰에 전달)
import { createClient } from "@/lib/supabase/server";
import { ItemsView, type ItemRow } from "./view";

export default async function ItemsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, item_code, name, spec, unit, item_type, price_in, price_out, safety_stock, is_active")
    .order("item_code");
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  return <ItemsView rows={(data ?? []) as ItemRow[]} />;
}
