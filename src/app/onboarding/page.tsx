// 첫 로그인 후 회사를 생성하는 온보딩 페이지
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function createCompany(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const name = String(formData.get("name")).trim();
  if (!name) redirect("/onboarding?error=" + encodeURIComponent("회사명을 입력해 주세요."));
  const { error } = await supabase.rpc("create_company", { p_name: name });
  if (error) redirect("/onboarding?error=" + encodeURIComponent(error.message));
  redirect("/");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-bold">회사 만들기</h1>
        <p className="mb-6 text-sm text-gray-500">
          사용할 회사를 등록하세요. 등록한 사람이 소유자(owner)가 됩니다.
        </p>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}
        <form action={createCompany} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              회사명
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            회사 생성
          </button>
        </form>
      </div>
    </main>
  );
}
