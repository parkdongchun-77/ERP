// 수동 전표 생성과 역분개 Server Actions (차대 일치는 DB 함수가 강제)
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type JournalLineInput = {
  account_code: string;
  debit: number;
  credit: number;
  memo?: string;
};

export async function createManualJournal(input: {
  entry_date: string;
  description: string;
  lines: JournalLineInput[];
}) {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  if (!m) return { error: "소속 회사가 없습니다." };
  const { error } = await supabase.rpc("create_journal_entry", {
    p_cid: m.company_id,
    p_date: input.entry_date,
    p_description: input.description || null,
    p_source_type: "manual",
    p_source_id: null,
    p_lines: input.lines,
  });
  if (error) return { error: error.message };
  revalidatePath("/accounting");
  return { error: null };
}

export async function reverseEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reverse_journal_entry", { p_entry: id });
  if (error) return { error: error.message };
  revalidatePath("/accounting");
  return { error: null };
}
