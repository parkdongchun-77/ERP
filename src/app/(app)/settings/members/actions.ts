// 멤버 초대 생성/취소 Server Actions (owner/admin 전용, RLS로도 강제됨)
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function inviteMember(formData: FormData) {
  const supabase = await createClient();
  const companyId = String(formData.get("company_id"));
  const email = String(formData.get("email")).trim().toLowerCase();
  const role = String(formData.get("role"));

  const { error } = await supabase
    .from("invitations")
    .insert({ company_id: companyId, email, role, invited_by: (await supabase.auth.getUser()).data.user?.id });
  if (error)
    redirect("/settings/members?error=" + encodeURIComponent(error.message));
  revalidatePath("/settings/members");
  redirect("/settings/members");
}

export async function cancelInvitation(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error)
    redirect("/settings/members?error=" + encodeURIComponent(error.message));
  revalidatePath("/settings/members");
  redirect("/settings/members");
}
