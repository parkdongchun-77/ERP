// 로그인/가입 페이지
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-bold">ERP System</h1>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}
        {notice && (
          <p className="mb-4 rounded bg-blue-50 p-2 text-sm text-blue-600">{notice}</p>
        )}
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
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
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <button
            formAction={signIn}
            className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            로그인
          </button>
          <button
            formAction={signUp}
            className="w-full rounded border py-2 text-sm font-medium hover:bg-gray-50"
          >
            회원가입
          </button>
        </form>
      </div>
    </main>
  );
}
