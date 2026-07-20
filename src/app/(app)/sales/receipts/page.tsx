// 수금 등록과 거래처별 미수금 현황 페이지
import { createClient } from "@/lib/supabase/server";
import { ReceiptsView } from "./view";

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const [{ data: balances, error }, { data: recent }] = await Promise.all([
    supabase
      .from("partner_receivables")
      .select("partner_id, partner_code, partner_name, sales_total, received_total, balance")
      .or("sales_total.gt.0,received_total.gt.0")
      .order("balance", { ascending: false }),
    supabase
      .from("receipts")
      .select("id, receipt_date, amount, method, memo, partners(name)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <ReceiptsView
      balances={(balances ?? []).map((b) => ({
        partner_id: b.partner_id,
        partner_code: b.partner_code,
        partner_name: b.partner_name,
        sales_total: Number(b.sales_total),
        received_total: Number(b.received_total),
        balance: Number(b.balance),
      }))}
      recent={(recent ?? []).map((r) => ({
        id: r.id,
        receipt_date: r.receipt_date,
        amount: Number(r.amount),
        method: r.method,
        memo: r.memo,
        partner: (r.partners as unknown as { name: string } | null)?.name ?? "?",
      }))}
    />
  );
}
