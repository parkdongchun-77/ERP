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

export async function updateRate(id: string, rate: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_rates").update({ rate }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/payroll");
  return { error: null };
}
