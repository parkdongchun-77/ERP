// 근태/연차 페이지 (월별 근태 기록 + 연차 현황)
import { createClient } from "@/lib/supabase/server";
import { AttendanceView } from "./view";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const to = new Date(y, m, 0).toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: records, error }, { data: employees }, { data: leave }] = await Promise.all([
    supabase
      .from("attendances")
      .select("id, work_date, att_type, check_in, check_out, memo, employees(emp_no, name)")
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false }),
    supabase.from("employees").select("id, emp_no, name").eq("is_active", true).order("emp_no"),
    supabase.from("leave_status").select("employee_id, emp_no, name, granted, used, remaining"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <AttendanceView
      month={month}
      employees={(employees ?? []).map((e) => ({ id: e.id, label: `[${e.emp_no}] ${e.name}` }))}
      records={(records ?? []).map((r) => ({
        id: r.id,
        work_date: r.work_date,
        att_type: r.att_type,
        check_in: r.check_in,
        check_out: r.check_out,
        memo: r.memo,
        employee:
          (r.employees as unknown as { emp_no: string; name: string } | null)?.name ?? "?",
      }))}
      leave={(leave ?? []).map((l) => ({
        employee_id: l.employee_id,
        emp_no: l.emp_no,
        name: l.name,
        granted: Number(l.granted),
        used: Number(l.used),
        remaining: Number(l.remaining),
      }))}
    />
  );
}
