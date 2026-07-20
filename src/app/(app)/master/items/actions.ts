// 품목 CRUD와 엑셀 대량 등록 Server Actions
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ItemInput = {
  item_code: string;
  name: string;
  spec?: string;
  unit?: string;
  item_type?: string;
  price_in?: number;
  price_out?: number;
};

async function companyId() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  return { supabase, companyId: data?.company_id as string | undefined };
}

export async function saveItem(input: ItemInput & { id?: string }) {
  const { supabase, companyId: cid } = await companyId();
  if (!cid) return { error: "소속 회사가 없습니다." };
  const row = { ...input, company_id: cid };
  const { error } = input.id
    ? await supabase.from("items").update(row).eq("id", input.id)
    : await supabase.from("items").insert(row);
  if (error) {
    if (error.code === "23505") return { error: "이미 존재하는 품목코드입니다." };
    return { error: error.message };
  }
  revalidatePath("/master/items");
  return { error: null };
}

export async function deleteItem(id: string) {
  const { supabase } = await companyId();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/master/items");
  return { error: null };
}

export async function bulkCreateItems(rows: ItemInput[]) {
  const { supabase, companyId: cid } = await companyId();
  if (!cid) return { success: 0, failures: [{ row: 0, reason: "소속 회사가 없습니다." }] };
  let success = 0;
  const failures: { row: number; reason: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.item_code || !r.name) {
      failures.push({ row: i + 2, reason: "품목코드와 품목명은 필수입니다." });
      continue;
    }
    const { error } = await supabase.from("items").insert({ ...r, company_id: cid });
    if (error)
      failures.push({
        row: i + 2,
        reason: error.code === "23505" ? "품목코드 중복" : error.message,
      });
    else success++;
  }
  revalidatePath("/master/items");
  return { success, failures };
}
