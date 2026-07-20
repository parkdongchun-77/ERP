// 급여대장 상세 (사원별 급여명세 요약, 인쇄 가능)
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("pay_year, pay_month, status, payroll_lines(id, gross, deductions, deduction_total, net, employees(emp_no, name))")
    .eq("id", id)
    .maybeSingle();
  if (!run) notFound();

  type Line = {
    id: string;
    gross: number;
    deductions: Record<string, number>;
    deduction_total: number;
    net: number;
    employees: { emp_no: string; name: string } | null;
  };
  const lines = (run.payroll_lines as unknown as Line[]) ?? [];
  const dedKeys = lines.length > 0 ? Object.keys(lines[0].deductions) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">
        {run.pay_year}년 {run.pay_month}월 급여대장 ({run.status === "confirmed" ? "확정" : "임시"})
      </h1>
      <table className="w-full border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">사번</th>
            <th className="border p-2">이름</th>
            <th className="border p-2 text-right">기본급</th>
            {dedKeys.map((k) => (
              <th key={k} className="border p-2 text-right">
                {k}
              </th>
            ))}
            <th className="border p-2 text-right">공제계</th>
            <th className="border p-2 text-right">실지급액</th>
            <th className="border p-2">명세서</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="border p-2">{l.employees?.emp_no}</td>
              <td className="border p-2">{l.employees?.name}</td>
              <td className="border p-2 text-right">{Number(l.gross).toLocaleString()}</td>
              {dedKeys.map((k) => (
                <td key={k} className="border p-2 text-right">
                  {Number(l.deductions[k] ?? 0).toLocaleString()}
                </td>
              ))}
              <td className="border p-2 text-right">{Number(l.deduction_total).toLocaleString()}</td>
              <td className="border p-2 text-right font-medium">{Number(l.net).toLocaleString()}</td>
              <td className="border p-2 text-center">
                <a
                  href={`/payroll/slip/${l.id}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  인쇄
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
