// 자동분개 계정 매핑 저장 Server Action (빈 값이면 매핑 삭제 = 기본값 사용)
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveJournalMap(companyId: string, txnKey: string, accountCode: string) {
  const supabase = await createClient();
  if (!accountCode) {
    const { error } = await supabase
      .from("journal_account_map")
      .delete()
      .eq("company_id", companyId)
      .eq("txn_key", txnKey);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("journal_account_map")
      .upsert(
        { company_id: companyId, txn_key: txnKey, account_code: accountCode },
        { onConflict: "company_id,txn_key" }
      );
    if (error) return { error: error.message };
  }
  revalidatePath("/settings/journal-map");
  return { error: null };
}
