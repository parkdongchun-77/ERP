// 단순 마스터(창고/부서/사원) 공용 CRUD Server Actions. 테이블·컬럼 화이트리스트로 제한
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED: Record<string, string[]> = {
  warehouses: ["code", "name", "is_active"],
  departments: ["code", "name", "is_active"],
  employees: ["emp_no", "name", "department_id", "position", "join_date", "base_salary", "is_active"],
};

function pick(table: string, data: Record<string, unknown>) {
  const cols = ALLOWED[table];
  if (!cols) throw new Error("허용되지 않은 테이블입니다.");
  const out: Record<string, unknown> = {};
  for (const c of cols) if (c in data) out[c] = data[c] === "" ? null : data[c];
  return out;
}

export async function saveSimpleRow(
  table: string,
  data: Record<string, unknown>,
  id?: string
) {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  if (!m) return { error: "소속 회사가 없습니다." };
  let row: Record<string, unknown>;
  try {
    row = { ...pick(table, data), company_id: m.company_id };
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = id
    ? await supabase.from(table).update(row).eq("id", id)
    : await supabase.from(table).insert(row);
  if (error) {
    if (error.code === "23505") return { error: "이미 존재하는 코드입니다." };
    return { error: error.message };
  }
  revalidatePath("/master");
  return { error: null };
}

export async function deleteSimpleRow(table: string, id: string) {
  if (!ALLOWED[table]) return { error: "허용되지 않은 테이블입니다." };
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/master");
  return { error: null };
}
