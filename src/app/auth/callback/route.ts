// 소셜 로그인 OAuth 콜백: 인증 코드를 세션으로 교환한 뒤 앱으로 이동
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorDescription = url.searchParams.get("error_description");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${url.origin}/`);
    return NextResponse.redirect(
      `${url.origin}/login?error=` + encodeURIComponent(error.message)
    );
  }
  return NextResponse.redirect(
    `${url.origin}/login?error=` +
      encodeURIComponent(errorDescription ?? "소셜 로그인에 실패했습니다.")
  );
}
