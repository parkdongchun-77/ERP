// 초대 링크 수락 페이지. 로그인 상태면 RPC로 멤버십을 생성하고, 아니면 로그인으로 안내
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function accept(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const token = String(formData.get("token"));
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error)
    redirect(`/invite/${token}?error=` + encodeURIComponent(error.message));
  redirect("/");
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="mb-4 text-xl font-bold">회사 초대</h1>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}
        {user ? (
          <form action={accept}>
            <input type="hidden" name="token" value={token} />
            <p className="mb-4 text-sm text-gray-600">
              {user.email} 계정으로 초대를 수락합니다.
            </p>
            <button className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
              초대 수락
            </button>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-gray-600">
            <p>초대를 수락하려면 먼저 로그인(또는 가입)하세요.</p>
            <p>로그인 후 이 초대 링크를 다시 열면 수락할 수 있습니다.</p>
            <Link
              href="/login"
              className="block w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
            >
              로그인하러 가기
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
