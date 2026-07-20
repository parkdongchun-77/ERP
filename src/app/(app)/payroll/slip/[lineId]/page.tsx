// 사원별 급여명세서 (인쇄용)
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

export default async function PaySlipPage({
  params,
}: {
  params: Promise<{ lineId: string }>;
}) {
  const { lineId } = await params;
  const supabase = await createClient();
  const [{ data: line }, { data: company }] = await Promise.all([
    supabase
      .from("payroll_lines")
      .select(
        "gross, deductions, deduction_total, net, employees(emp_no, name, position), payroll_runs(pay_year, pay_month, status)"
      )
      .eq("id", lineId)
      .maybeSingle(),
    supabase.from("companies").select("name").limit(1).maybeSingle(),
  ]);
  if (!line) notFound();

  const emp = line.employees as unknown as {
    emp_no: string;
    name: string;
    position: string | null;
  } | null;
  const run = line.payroll_runs as unknown as {
    pay_year: number;
    pay_month: number;
    status: string;
  } | null;
  const deductions = (line.deductions as Record<string, number>) ?? {};

  return (
    <main className="mx-auto max-w-md bg-white p-8 print:p-0">
      <h1 className="mb-1 text-center text-xl font-bold tracking-widest">급 여 명 세 서</h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        {run?.pay_year}년 {run?.pay_month}월분 · {company?.name}
      </p>
      <table className="w-full border-collapse border text-sm">
        <tbody>
          <tr>
            <td className="w-28 border bg-gray-50 p-2">사번 / 이름</td>
            <td className="border p-2">
              {emp?.emp_no} / {emp?.name} {emp?.position && `(${emp.position})`}
            </td>
          </tr>
          <tr>
            <td className="border bg-gray-50 p-2">기본급</td>
            <td className="border p-2 text-right">{Number(line.gross).toLocaleString()}원</td>
          </tr>
          {Object.entries(deductions).map(([name, amt]) => (
            <tr key={name}>
              <td className="border bg-gray-50 p-2">{name}</td>
              <td className="border p-2 text-right text-red-600">
                −{Number(amt).toLocaleString()}원
              </td>
            </tr>
          ))}
          <tr>
            <td className="border bg-gray-50 p-2 font-medium">공제 합계</td>
            <td className="border p-2 text-right font-medium text-red-600">
              −{Number(line.deduction_total).toLocaleString()}원
            </td>
          </tr>
          <tr>
            <td className="border bg-blue-50 p-2 font-bold">실지급액</td>
            <td className="border bg-blue-50 p-2 text-right font-bold">
              {Number(line.net).toLocaleString()}원
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-gray-400">
        간이 계산 명세입니다. 실제 신고 값과 다를 수 있습니다.
        {run?.status !== "confirmed" && " (임시 급여대장)"}
      </p>
      <div className="mt-6 text-center print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}
