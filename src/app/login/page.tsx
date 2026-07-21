// 로그인/가입 페이지. 소셜 로그인은 NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN=true일 때만 노출(기능은 유지)
import { signIn, signUp, signInWithProvider } from "./actions";

const SOCIAL_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === "true";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-extrabold text-gray-900">ERP System</h1>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}
        {notice && (
          <p className="mb-4 rounded bg-blue-50 p-2 text-sm text-blue-600">{notice}</p>
        )}
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gray-900">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-900">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded border border-gray-400 px-3 py-2 text-sm text-gray-900"
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
            className="w-full rounded border border-gray-400 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
          >
            회원가입
          </button>
        </form>

        {SOCIAL_LOGIN_ENABLED && (
          <>
            <div className="my-5 flex items-center gap-3">
              <hr className="flex-1" />
              <span className="text-xs text-gray-400">또는 간편 로그인</span>
              <hr className="flex-1" />
            </div>

            <form className="space-y-2">
              <button
                formAction={signInWithProvider}
                name="provider"
                value="kakao"
                className="w-full rounded bg-[#FEE500] py-2 text-sm font-medium text-[#191919] hover:brightness-95"
              >
                카카오로 시작하기
              </button>
              <button
                formAction={signInWithProvider}
                name="provider"
                value="google"
                className="w-full rounded border py-2 text-sm font-medium hover:bg-gray-50"
              >
                Google로 시작하기
              </button>
              <button
                formAction={signInWithProvider}
                name="provider"
                value="facebook"
                className="w-full rounded bg-[#1877F2] py-2 text-sm font-medium text-white hover:brightness-95"
              >
                Facebook으로 시작하기
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-gray-400">
              처음 로그인하면 계정이 자동으로 만들어집니다.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
