// 근태 기록·연차 현황 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttendance, deleteAttendance } from "../actions";

type Option = { id: string; label: string };
type Record_ = {
  id: string;
  work_date: string;
  att_type: string;
  check_in: string | null;
  check_out: string | null;
  memo: string | null;
  employee: string;
};
type Leave = {
  employee_id: string;
  emp_no: string;
  name: string;
  granted: number;
  used: number;
  remaining: number;
};

const TYPE_LABEL: Record<string, string> = {
  work: "출근",
  leave: "연차",
  half: "반차",
  absent: "결근",
};

export function AttendanceView({
  month,
  employees,
  records,
  leave,
}: {
  month: string;
  employees: Option[];
  records: Record_[];
  leave: Leave[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    employee_id: "",
    work_date: today,
    att_type: "work",
    check_in: "09:00",
    check_out: "18:00",
    memo: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const isWork = form.att_type === "work";
    const { error } = await saveAttendance({
      ...form,
      check_in: isWork ? form.check_in : undefined,
      check_out: isWork ? form.check_out : undefined,
    });
    if (error) setError(error);
    else {
      setError(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("기록을 삭제하시겠습니까?")) return;
    const { error } = await deleteAttendance(id);
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">근태/연차</h1>
        <form className="flex items-end gap-2">
          <input type="month" name="month" defaultValue={month} className="rounded border px-2 py-1.5 text-sm" />
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">이동</button>
        </form>
      </div>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">사원</label>
          <select
            required
            value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            className="w-44 rounded border px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">일자</label>
          <input
            type="date"
            value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">유형</label>
          <select
            value={form.att_type}
            onChange={(e) => setForm({ ...form, att_type: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {form.att_type === "work" && (
          <>
            <div>
              <label className="mb-1 block text-xs text-gray-500">출근</label>
              <input
                type="time"
                value={form.check_in}
                onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                className="rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">퇴근</label>
              <input
                type="time"
                value={form.check_out}
                onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                className="rounded border px-2 py-1.5 text-sm"
              />
            </div>
          </>
        )}
        <div>
          <label className="mb-1 block text-xs text-gray-500">메모</label>
          <input
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-36 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          기록 (같은 날짜는 덮어씀)
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">{month} 근태 기록</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2">일자</th>
                <th className="p-2">사원</th>
                <th className="p-2">유형</th>
                <th className="p-2">출근</th>
                <th className="p-2">퇴근</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{r.work_date}</td>
                    <td className="p-2">{r.employee}</td>
                    <td className="p-2">{TYPE_LABEL[r.att_type] ?? r.att_type}</td>
                    <td className="p-2">{r.check_in?.slice(0, 5)}</td>
                    <td className="p-2">{r.check_out?.slice(0, 5)}</td>
                    <td className="p-2">
                      <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:underline">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">연차 현황 (올해)</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2">사원</th>
                <th className="p-2 text-right">부여</th>
                <th className="p-2 text-right">사용</th>
                <th className="p-2 text-right">잔여</th>
              </tr>
            </thead>
            <tbody>
              {leave.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    사원이 없습니다.
                  </td>
                </tr>
              ) : (
                leave.map((l) => (
                  <tr key={l.employee_id} className="border-b">
                    <td className="p-2">
                      [{l.emp_no}] {l.name}
                    </td>
                    <td className="p-2 text-right">{l.granted}</td>
                    <td className="p-2 text-right">{l.used}</td>
                    <td className={`p-2 text-right font-medium ${l.remaining < 0 ? "text-red-600" : ""}`}>
                      {l.remaining}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-400">연차 부여일수는 사원 마스터에서 수정합니다(기본 15일).</p>
        </section>
      </div>
    </div>
  );
}
