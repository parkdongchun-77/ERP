// 급여 페이지 (요율 관리 + 급여대장 생성/확정 목록)
import { createClient } from "@/lib/supabase/server";
import { PayrollView } from "./view";

export default async function PayrollPage() {
  const supabase = await createClient();
  const [{ data: runs, error }, { data: rates }] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("id, pay_year, pay_month, status, payroll_lines(gross, deduction_total, net)")
      .order("pay_year", { ascending: false })
      .order("pay_month", { ascending: false }),
    supabase.from("payroll_rates").select("id, code, name, rate").order("code"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <PayrollView
      runs={(runs ?? []).map((r) => {
        const lines = (r.payroll_lines as { gross: number; deduction_total: number; net: number }[]) ?? [];
        return {
          id: r.id,
          pay_year: r.pay_year,
          pay_month: r.pay_month,
          status: r.status,
          headcount: lines.length,
          gross: lines.reduce((s, l) => s + Number(l.gross), 0),
          deduction: lines.reduce((s, l) => s + Number(l.deduction_total), 0),
          net: lines.reduce((s, l) => s + Number(l.net), 0),
        };
      })}
      rates={(rates ?? []).map((r) => ({ ...r, rate: Number(r.rate) }))}
    />
  );
}
