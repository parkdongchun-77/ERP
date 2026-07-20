// 사원 마스터 페이지 (부서 선택 포함, 급여 상세는 Phase 8에서 확장)
import { createClient } from "@/lib/supabase/server";
import { SimpleMaster } from "@/components/simple-master";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const [{ data: employees, error }, { data: departments }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, emp_no, name, department_id, position, join_date, base_salary, annual_leave_days")
      .order("emp_no"),
    supabase.from("departments").select("id, name").order("code"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  return (
    <SimpleMaster
      title="사원"
      table="employees"
      fields={[
        { key: "emp_no", label: "사번", required: true, width: "w-24" },
        { key: "name", label: "이름", required: true, width: "w-28" },
        {
          key: "department_id",
          label: "부서",
          type: "select",
          options: (departments ?? []).map((d) => ({ value: d.id, label: d.name })),
        },
        { key: "position", label: "직급", width: "w-24" },
        { key: "join_date", label: "입사일", type: "date", width: "w-36" },
        { key: "base_salary", label: "기본급(월)", width: "w-32" },
        { key: "annual_leave_days", label: "연차부여", width: "w-20" },
      ]}
      rows={employees ?? []}
    />
  );
}
