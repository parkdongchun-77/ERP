// 지급 등록과 거래처별 미지급금 현황 페이지
import { createClient } from "@/lib/supabase/server";
import { PaymentsView } from "./view";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const [{ data: balances, error }, { data: recent }] = await Promise.all([
    supabase
      .from("partner_payables")
      .select("partner_id, partner_code, partner_name, purchase_total, paid_total, balance")
      .or("purchase_total.gt.0,paid_total.gt.0")
      .order("balance", { ascending: false }),
    supabase
      .from("payments")
      .select("id, payment_date, amount, method, memo, partners(name)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <PaymentsView
      balances={(balances ?? []).map((b) => ({
        partner_id: b.partner_id,
        partner_code: b.partner_code,
        partner_name: b.partner_name,
        purchase_total: Number(b.purchase_total),
        paid_total: Number(b.paid_total),
        balance: Number(b.balance),
      }))}
      recent={(recent ?? []).map((r) => ({
        id: r.id,
        payment_date: r.payment_date,
        amount: Number(r.amount),
        method: r.method,
        memo: r.memo,
        partner: (r.partners as unknown as { name: string } | null)?.name ?? "?",
      }))}
    />
  );
}
