// 전자결재 페이지 (요청 작성, 내 결재 대기, 전체 목록)
import { createClient } from "@/lib/supabase/server";
import { ApprovalsView } from "./view";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: m } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();

  const [{ data: approvals, error }, { data: members }] = await Promise.all([
    supabase
      .from("approvals")
      .select("id, title, content, requester, approver, status, decided_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    m
      ? supabase.rpc("members_with_email", { cid: m.company_id })
      : Promise.resolve({ data: [] }),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  type Member = { user_id: string; email: string };
  const memberList = ((members ?? []) as Member[]).map((mm) => ({
    id: mm.user_id,
    email: mm.email,
  }));
  const emailMap = new Map(memberList.map((mm) => [mm.id, mm.email]));

  return (
    <ApprovalsView
      me={user?.id ?? ""}
      members={memberList}
      approvals={(approvals ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        requester: emailMap.get(a.requester) ?? "?",
        approver: emailMap.get(a.approver) ?? "?",
        approver_id: a.approver,
        status: a.status,
        created_at: a.created_at,
      }))}
    />
  );
}
