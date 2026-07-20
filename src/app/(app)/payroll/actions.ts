// 급여대장 생성·확정·삭제와 요율 수정 Server Actions
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generatePayroll(year: number, month: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_payroll", { p_year: year, p_month: month });
  if (error) return { error: error.message };
  revalidatePath("/payroll");
  return { error: null };
}

export async function confirmPayroll(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_payroll", { p_run: id });
  if (error) return { error: error.message };
  revalidatePath("/payroll");
  return { error: null };
}

export async function deletePayrollRun(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_runs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/payroll");
  return { error: null };
}

export async function saveAttendance(input: {
  employee_id: string;
  work_date: string;
  att_type: string;
  check_in?: string;
  check_out?: string;
  memo?: string;
}) {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  if (!m) return { error: "소속 회사가 없습니다." };
  const { error } = await supabase.from("attendances").upsert(
    {
      company_id: m.company_id,
      employee_id: input.employee_id,
      work_date: input.work_date,
      att_type: input.att_type,
      check_in: input.check_in || null,
      check_out: input.check_out || null,
      memo: input.memo || null,
    },
    { onConflict: "employee_id,work_date" }
  );
  if (error) return { error: error.message };
  revalidatePath("/payroll/attendance");
  return { error: null };
}

export async function deleteAttendance(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("attendances").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/payroll/attendance");
  return { error: null };
}

export async function updateRate(id: string, rate: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_rates").update({ rate }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/payroll");
  return { error: null };
}
