// BOM 저장/삭제, 작업지시 생성/완료/삭제 Server Actions
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  return { supabase, cid: data?.company_id as string | undefined };
}

export async function saveBom(input: {
  product_item_id: string;
  lines: { material_item_id: string; qty_per: number }[];
}) {
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  if (input.lines.length === 0) return { error: "자재를 1개 이상 입력하세요." };

  const { data: existing } = await supabase
    .from("boms")
    .select("id")
    .eq("product_item_id", input.product_item_id)
    .maybeSingle();

  let bomId = existing?.id;
  if (bomId) {
    await supabase.from("bom_lines").delete().eq("bom_id", bomId);
  } else {
    const { data: created, error } = await supabase
      .from("boms")
      .insert({ company_id: cid, product_item_id: input.product_item_id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    bomId = created.id;
  }
  const { error } = await supabase.from("bom_lines").insert(
    input.lines.map((l) => ({ company_id: cid, bom_id: bomId, ...l }))
  );
  if (error) return { error: error.message };
  revalidatePath("/production");
  return { error: null };
}

export async function deleteBom(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("boms").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/production");
  return { error: null };
}

export async function createWorkOrder(input: {
  item_id: string;
  order_qty: number;
  warehouse_id: string;
  due_date?: string;
  memo?: string;
}) {
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  const { data: docNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_cid: cid,
    p_type: "work_order",
    p_prefix: "WO",
  });
  if (noError) return { error: noError.message };
  const { error } = await supabase.from("work_orders").insert({
    company_id: cid,
    doc_no: docNo,
    item_id: input.item_id,
    order_qty: input.order_qty,
    warehouse_id: input.warehouse_id,
    due_date: input.due_date || null,
    memo: input.memo || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/production/work-orders");
  return { error: null };
}

export async function completeWorkOrder(id: string, qty: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("complete_work_order", { p_wo: id, p_qty: qty });
  if (error) return { error: error.message };
  revalidatePath("/production/work-orders");
  return { error: null };
}

export async function deleteWorkOrder(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("work_orders").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/production/work-orders");
  return { error: null };
}
