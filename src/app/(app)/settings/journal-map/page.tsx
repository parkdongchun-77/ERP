// 자동분개 계정 매핑 설정 페이지 (관리자 전용)
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JournalMapView } from "./view";

export const TXN_KEYS: { key: string; label: string; def: string }[] = [
  { key: "sale_receivable", label: "판매 채권 (차변)", def: "108" },
  { key: "sale_revenue", label: "판매 매출 (대변)", def: "401" },
  { key: "sale_vat", label: "판매 부가세 (대변)", def: "255" },
  { key: "purchase_inventory", label: "구매 재고자산 (차변)", def: "146" },
  { key: "purchase_vat", label: "구매 부가세 (차변)", def: "135" },
  { key: "purchase_payable", label: "구매 채무 (대변)", def: "251" },
  { key: "cash_account", label: "수금/지급 현금성 계정", def: "103" },
  { key: "payroll_expense", label: "급여 비용 (차변)", def: "801" },
  { key: "payroll_withholding", label: "급여 예수금 (대변)", def: "254" },
];

export default async function JournalMapPage() {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("company_id, role")
    .limit(1)
    .maybeSingle();
  if (!m || !["owner", "admin"].includes(m.role)) redirect("/");

  const [{ data: maps }, { data: accounts }] = await Promise.all([
    supabase.from("journal_account_map").select("txn_key, account_code"),
    supabase.from("accounts").select("code, name").eq("is_active", true).order("code"),
  ]);

  const current = new Map((maps ?? []).map((r) => [r.txn_key, r.account_code]));
  return (
    <JournalMapView
      companyId={m.company_id}
      rows={TXN_KEYS.map((t) => ({
        key: t.key,
        label: t.label,
        def: t.def,
        current: current.get(t.key) ?? "",
      }))}
      accounts={(accounts ?? []).map((a) => ({ code: a.code, name: a.name }))}
    />
  );
}
