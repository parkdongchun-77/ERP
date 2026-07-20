// 창고이동 페이지 (품목/창고 목록을 조회해 클라이언트 폼에 전달)
import { createClient } from "@/lib/supabase/server";
import { TransferView } from "./view";

export default async function TransferPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: warehouses }] = await Promise.all([
    supabase.from("items").select("id, item_code, name").eq("is_active", true).order("item_code"),
    supabase.from("warehouses").select("id, code, name").eq("is_active", true).order("code"),
  ]);
  return <TransferView items={items ?? []} warehouses={warehouses ?? []} />;
}
