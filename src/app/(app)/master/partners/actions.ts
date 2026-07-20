// 거래처 CRUD와 엑셀 대량 등록 Server Actions
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PartnerInput = {
  partner_code: string;
  name: string;
  biz_no?: string;
  ceo_name?: string;
  partner_type?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
};

async function ctx() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  return { supabase, cid: data?.company_id as string | undefined };
}

export async function savePartner(input: PartnerInput & { id?: string }) {
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  const { error } = input.id
    ? await supabase.from("partners").update({ ...input, company_id: cid }).eq("id", input.id)
    : await supabase.from("partners").insert({ ...input, company_id: cid });
  if (error) {
    if (error.code === "23505") return { error: "이미 존재하는 거래처코드입니다." };
    return { error: error.message };
  }
  revalidatePath("/master/partners");
  return { error: null };
}

export async function deletePartner(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/master/partners");
  return { error: null };
}

export async function bulkCreatePartners(rows: PartnerInput[]) {
  const { supabase, cid } = await ctx();
  if (!cid) return { success: 0, failures: [{ row: 0, reason: "소속 회사가 없습니다." }] };
  let success = 0;
  const failures: { row: number; reason: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.partner_code || !r.name) {
      failures.push({ row: i + 2, reason: "거래처코드와 상호는 필수입니다." });
      continue;
    }
    const { error } = await supabase.from("partners").insert({ ...r, company_id: cid });
    if (error)
      failures.push({
        row: i + 2,
        reason: error.code === "23505" ? "거래처코드 중복" : error.message,
      });
    else success++;
  }
  revalidatePath("/master/partners");
  return { success, failures };
}
