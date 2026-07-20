// 전자결재 페이지 (다단계 결재선, 판매/구매 전표 연동)
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

  const [{ data: approvals, error }, { data: members }, { data: draftSales }, { data: draftPurchases }] =
    await Promise.all([
      supabase
        .from("approvals")
        .select(
          "id, title, content, requester, doc_type, doc_id, status, current_seq, created_at, approval_steps(seq, approver, status)"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      m ? supabase.rpc("members_with_email", { cid: m.company_id }) : Promise.resolve({ data: [] }),
      supabase.from("sales").select("id, doc_no").eq("status", "draft"),
      supabase.from("purchases").select("id, doc_no").eq("status", "draft"),
    ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  type Member = { user_id: string; email: string };
  const memberList = ((members ?? []) as Member[]).map((mm) => ({
    id: mm.user_id,
    email: mm.email,
  }));
  const emailMap = new Map(memberList.map((mm) => [mm.id, mm.email]));

  type Step = { seq: number; approver: string; status: string };
  return (
    <ApprovalsView
      me={user?.id ?? ""}
      members={memberList}
      draftDocs={[
        ...(draftSales ?? []).map((d) => ({ key: `sale:${d.id}`, label: `판매 ${d.doc_no}` })),
        ...(draftPurchases ?? []).map((d) => ({ key: `purchase:${d.id}`, label: `구매 ${d.doc_no}` })),
      ]}
      approvals={(approvals ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        requester: emailMap.get(a.requester) ?? "?",
        doc_type: a.doc_type,
        status: a.status,
        current_seq: a.current_seq,
        created_at: a.created_at,
        steps: [...((a.approval_steps as Step[]) ?? [])]
          .sort((x, y) => x.seq - y.seq)
          .map((s) => ({
            seq: s.seq,
            approver: emailMap.get(s.approver) ?? "?",
            approver_id: s.approver,
            status: s.status,
          })),
      }))}
    />
  );
}
