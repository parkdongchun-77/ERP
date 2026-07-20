// 재고조정·창고이동 Server Actions (재고 변동은 stock_movements를 통해서만)
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function adjustStock(input: {
  item_id: string;
  warehouse_id: string;
  qty: number;
  movement_date: string;
  memo?: string;
}) {
  if (!input.qty) return { error: "조정 수량은 0이 될 수 없습니다." };
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  if (!m) return { error: "소속 회사가 없습니다." };
  const { error } = await supabase.from("stock_movements").insert({
    company_id: m.company_id,
    item_id: input.item_id,
    warehouse_id: input.warehouse_id,
    qty: input.qty,
    movement_date: input.movement_date,
    movement_type: "adjust",
    memo: input.memo || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return { error: null };
}

export async function transferStock(input: {
  item_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  qty: number;
  movement_date: string;
  memo?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_stock", {
    p_item: input.item_id,
    p_from_wh: input.from_warehouse_id,
    p_to_wh: input.to_warehouse_id,
    p_qty: input.qty,
    p_date: input.movement_date,
    p_memo: input.memo || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return { error: null };
}
