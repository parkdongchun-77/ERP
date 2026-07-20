// 대시보드 (이번달 매출/매입, 미수금 상위, 재고 부족, 결재 대기)
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const monthStart = new Date();
  monthStart.setDate(1);
  const from = monthStart.toISOString().slice(0, 10);

  const [salesRes, purchasesRes, receivablesRes, itemsRes, stockRes, approvalsRes] =
    await Promise.all([
      supabase
        .from("sales")
        .select("sales_lines(supply_amount, vat_amount)")
        .eq("status", "confirmed")
        .gte("doc_date", from),
      supabase
        .from("purchases")
        .select("purchase_lines(supply_amount, vat_amount)")
        .eq("status", "confirmed")
        .gte("doc_date", from),
      supabase
        .from("partner_receivables")
        .select("partner_name, balance")
        .gt("balance", 0)
        .order("balance", { ascending: false })
        .limit(5),
      supabase.from("items").select("id, safety_stock").gt("safety_stock", 0).eq("is_active", true),
      supabase.from("current_stock").select("item_id, qty"),
      supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .eq("approver", user?.id ?? "")
        .eq("status", "pending"),
    ]);

  type Amt = { supply_amount: number; vat_amount: number };
  const sumLines = (rows: { [k: string]: unknown }[] | null, key: string) =>
    (rows ?? []).reduce(
      (s, r) =>
        s +
        ((r[key] as Amt[]) ?? []).reduce(
          (ls, l) => ls + Number(l.supply_amount) + Number(l.vat_amount),
          0
        ),
      0
    );
  const salesTotal = sumLines(salesRes.data, "sales_lines");
  const purchaseTotal = sumLines(purchasesRes.data, "purchase_lines");

  const totals = new Map<string, number>();
  for (const s of stockRes.data ?? [])
    totals.set(s.item_id, (totals.get(s.item_id) ?? 0) + Number(s.qty));
  const shortageCount = (itemsRes.data ?? []).filter(
    (i) => (totals.get(i.id) ?? 0) < Number(i.safety_stock)
  ).length;
  const pendingApprovals = approvalsRes.count ?? 0;

  const cards = [
    { label: "이번달 매출(확정)", value: salesTotal.toLocaleString() + "원", href: "/sales/report" },
    { label: "이번달 매입(확정)", value: purchaseTotal.toLocaleString() + "원", href: "/purchasing" },
    { label: "안전재고 부족 품목", value: shortageCount + "개", href: "/inventory/shortage" },
    { label: "내 결재 대기", value: pendingApprovals + "건", href: "/groupware" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">대시보드</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded border bg-white p-4 hover:bg-gray-50">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </Link>
        ))}
      </div>
      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">미수금 상위 거래처</h2>
        {(receivablesRes.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">미수금이 없습니다.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(receivablesRes.data ?? []).map((r) => (
              <li key={r.partner_name} className="flex justify-between border-b py-1">
                <span>{r.partner_name}</span>
                <span className="font-medium text-red-600">
                  {Number(r.balance).toLocaleString()}원
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
