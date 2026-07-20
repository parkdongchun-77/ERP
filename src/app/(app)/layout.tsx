// 인증된 사용자 전용 레이아웃. 소속 회사가 없으면 온보딩으로 보낸다
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id, role, companies(name)")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const companyName =
    (membership.companies as unknown as { name: string } | null)?.name ?? "회사";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar companyName={companyName} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-white px-6 py-3">
          <span className="text-sm text-gray-600">{user.email}</span>
          <form action={signOut}>
            <button className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
              로그아웃
            </button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
