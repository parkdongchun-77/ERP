// 전자결재 요청/승인/반려와 게시판 Server Actions
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  return { supabase, cid: data?.company_id as string | undefined };
}

export async function requestApproval(input: {
  title: string;
  content?: string;
  approver: string;
}) {
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  const { error } = await supabase.from("approvals").insert({
    company_id: cid,
    title: input.title,
    content: input.content || null,
    approver: input.approver,
  });
  if (error) return { error: error.message };
  revalidatePath("/groupware");
  return { error: null };
}

export async function decideApproval(id: string, decision: "approved" | "rejected") {
  const { supabase } = await ctx();
  const { error, count } = await supabase
    .from("approvals")
    .update({ status: decision, decided_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error) return { error: error.message };
  if (count === 0) return { error: "처리 권한이 없거나 이미 처리된 결재입니다." };
  revalidatePath("/groupware");
  return { error: null };
}

export async function createPost(input: { title: string; content?: string }) {
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  const { error } = await supabase
    .from("posts")
    .insert({ company_id: cid, title: input.title, content: input.content || null });
  if (error) return { error: error.message };
  revalidatePath("/groupware/board");
  return { error: null };
}

export async function deletePost(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/groupware/board");
  return { error: null };
}
