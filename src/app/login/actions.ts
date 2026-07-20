// 로그인/가입 Server Actions
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect("/");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  // 이메일 확인이 꺼져 있으면 즉시 세션이 생기고, 켜져 있으면 확인 메일 안내
  if (data.session) redirect("/");
  redirect("/login?notice=" + encodeURIComponent("확인 메일을 보냈습니다. 메일함을 확인해 주세요."));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
