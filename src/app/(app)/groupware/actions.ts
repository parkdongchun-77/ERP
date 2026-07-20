// 전자결재(다단계)·게시판·일정 Server Actions
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
  approvers: string[];
  doc_type?: "sale" | "purchase";
  doc_id?: string;
}) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("request_approval", {
    p_title: input.title,
    p_content: input.content || null,
    p_approvers: input.approvers,
    p_doc_type: input.doc_type ?? null,
    p_doc_id: input.doc_id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/groupware");
  return { error: null };
}

export async function decideApproval(id: string, decision: "approved" | "rejected") {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("decide_approval", {
    p_approval: id,
    p_decision: decision,
  });
  if (error) return { error: error.message };
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

export async function createEvent(input: {
  title: string;
  event_date: string;
  start_time?: string;
  memo?: string;
}) {
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  const { error } = await supabase.from("events").insert({
    company_id: cid,
    title: input.title,
    event_date: input.event_date,
    start_time: input.start_time || null,
    memo: input.memo || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/groupware/calendar");
  return { error: null };
}

export async function deleteEvent(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/groupware/calendar");
  return { error: null };
}
