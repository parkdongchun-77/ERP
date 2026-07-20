// 급여대장 목록·생성·확정과 공제 요율 관리 클라이언트 뷰
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generatePayroll, confirmPayroll, deletePayrollRun, updateRate } from "./actions";

type Run = {
  id: string;
  pay_year: number;
  pay_month: number;
  status: string;
  headcount: number;
  gross: number;
  deduction: number;
  net: number;
};
type Rate = { id: string; code: string; name: string; rate: number };

export function PayrollView({ runs, rates }: { runs: Run[]; rates: Rate[] }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const { error } = await generatePayroll(year, month);
    if (error) setError(error);
    else {
      setError(null);
      router.refresh();
    }
  }

  async function confirmRun(id: string) {
    if (!confirm("확정하면 급여 분개가 생성되고 수정할 수 없습니다. 확정하시겠습니까?")) return;
    const { error } = await confirmPayroll(id);
    if (error) setError(error);
    else router.refresh();
  }

  async function removeRun(id: string) {
    if (!confirm("급여대장을 삭제하시겠습니까?")) return;
    const { error } = await deletePayrollRun(id);
    if (error) setError(error);
    else router.refresh();
  }

  async function changeRate(r: Rate) {
    const input = prompt(`${r.name} 요율(%)을 입력하세요`, String(r.rate));
    if (input == null) return;
    const { error } = await updateRate(r.id, Number(input));
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">급여</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">급여대장 생성</h2>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">연도</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">월</label>
            <input
              type="number"
              min="1"
              max="12"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-16 rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={generate}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            생성
          </button>
          <p className="text-xs text-gray-400">
            사원 마스터의 기본급 기준. 공제는 아래 요율표로 계산됩니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">급여대장</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">귀속월</th>
              <th className="p-2 text-right">인원</th>
              <th className="p-2 text-right">지급총액</th>
              <th className="p-2 text-right">공제총액</th>
              <th className="p-2 text-right">실지급총액</th>
              <th className="p-2">상태</th>
              <th className="p-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  급여대장이 없습니다.
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">
                    <Link href={`/payroll/${r.id}`} className="text-blue-600 hover:underline">
                      {r.pay_year}년 {r.pay_month}월
                    </Link>
                  </td>
                  <td className="p-2 text-right">{r.headcount}</td>
                  <td className="p-2 text-right">{r.gross.toLocaleString()}</td>
                  <td className="p-2 text-right">{r.deduction.toLocaleString()}</td>
                  <td className="p-2 text-right font-medium">{r.net.toLocaleString()}</td>
                  <td className="p-2">{r.status === "confirmed" ? "확정" : "임시"}</td>
                  <td className="space-x-2 p-2">
                    {r.status === "draft" && (
                      <>
                        <button onClick={() => confirmRun(r.id)} className="text-green-700 hover:underline">
                          확정
                        </button>
                        <button onClick={() => removeRun(r.id)} className="text-red-600 hover:underline">
                          삭제
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">공제 요율 (%)</h2>
        <div className="flex flex-wrap gap-2">
          {rates.map((r) => (
            <button
              key={r.id}
              onClick={() => changeRate(r)}
              className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              {r.name}: {r.rate}%
            </button>
          ))}
          {rates.length === 0 && (
            <p className="text-sm text-gray-400">첫 급여대장 생성 시 기본 요율이 등록됩니다.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          간이 계산입니다. 실제 4대보험·소득세 신고 값과 다를 수 있으며 세무 프로그램 병행을 전제로 합니다.
        </p>
      </section>
    </div>
  );
}
