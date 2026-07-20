// 설정 > 멤버 관리: 멤버 목록, 초대 생성, 대기 중 초대 링크 표시
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteMember, cancelInvitation } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  owner: "소유자",
  admin: "관리자",
  manager: "매니저",
  member: "멤버",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id, role")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");
  const isAdmin = ["owner", "admin"].includes(membership.role);
  if (!isAdmin) redirect("/");

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase.rpc("members_with_email", { cid: membership.company_id }),
    supabase
      .from("invitations")
      .select("id, email, role, token, status, expires_at")
      .eq("company_id", membership.company_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-lg font-bold">멤버 관리</h1>
      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">멤버</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">이메일</th>
              <th className="p-2">역할</th>
              <th className="p-2">등록일</th>
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map(
              (m: { membership_id: string; email: string; role: string; created_at: string }) => (
                <tr key={m.membership_id} className="border-b">
                  <td className="p-2">{m.email}</td>
                  <td className="p-2">{ROLE_LABEL[m.role] ?? m.role}</td>
                  <td className="p-2">{new Date(m.created_at).toLocaleDateString("ko-KR")}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">멤버 초대</h2>
        <form action={inviteMember} className="flex items-end gap-2">
          <input type="hidden" name="company_id" value={membership.company_id} />
          <div className="flex-1">
            <label htmlFor="email" className="mb-1 block text-xs text-gray-500">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="role" className="mb-1 block text-xs text-gray-500">
              역할
            </label>
            <select id="role" name="role" className="rounded border px-3 py-2 text-sm">
              <option value="member">멤버</option>
              <option value="manager">매니저</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            초대
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">대기 중 초대</h2>
        {(invitations ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">대기 중인 초대가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {(invitations ?? []).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {inv.email}{" "}
                    <span className="text-gray-400">({ROLE_LABEL[inv.role] ?? inv.role})</span>
                  </p>
                  <p className="mt-1 break-all text-xs text-gray-500">
                    초대 링크: /invite/{inv.token}
                  </p>
                </div>
                <form action={cancelInvitation}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50">취소</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-gray-400">
          메일 발송은 아직 연동되지 않았습니다. 초대 링크를 복사해 상대에게 전달하세요.
        </p>
      </section>
    </div>
  );
}
