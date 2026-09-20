// 웹 버전(erp-html/index.html)을 원본으로 데스크톱용 renderer/index.html 을 생성한다.
// 화면 코드를 두 벌 관리하지 않기 위해 데스크톱 차이(로컬 번들·CSP·자동 로그인)만 여기서 입힌다.
// 앵커 문자열이 원본에서 사라지면 즉시 실패시켜 조용한 드리프트를 막는다.
const fs = require("node:fs");
const path = require("node:path");

const SRC = process.argv[2] || path.join(__dirname, "..", "erp-html", "index.html");
const OUT = path.join(__dirname, "renderer", "index.html");

// 자동 로그인 계정은 저장소에 두지 않는다 (공개 저장소). desktop.secrets.json 에서 읽는다.
const SECRETS = path.join(__dirname, "desktop.secrets.json");
if (!fs.existsSync(SECRETS)) {
  console.error(`desktop.secrets.json 이 없습니다. 아래 내용으로 만드세요 (.gitignore 에 이미 등록됨):\n` +
    `  { "email": "admin@erp.local", "password": "..." }`);
  process.exit(1);
}
const { email, password } = JSON.parse(fs.readFileSync(SECRETS, "utf8"));
if (!email || !password) { console.error("desktop.secrets.json 에 email·password 가 필요합니다."); process.exit(1); }

let html = fs.readFileSync(SRC, "utf8").replace(/^﻿/, "");
let step = "";
function replaceOnce(from, to) {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`[${step}] 앵커가 ${n}번 발견됨 (1번이어야 함):\n${from.slice(0, 120)}`);
  html = html.replace(from, to);
}

// 1) CDN → 로컬 번들
step = "vendor";
replaceOnce('<script src="https://cdn.tailwindcss.com"></script>', '<script src="./vendor/tailwind.js"></script>');
replaceOnce('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script src="./vendor/supabase.js"></script>');
replaceOnce('<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js"></script>', '<script src="./vendor/xlsx.js"></script>');

// 2) CSP — 외부 통신은 ERP 서버로만
step = "csp";
replaceOnce('<meta name="robots" content="noindex, nofollow, noarchive">',
  '<meta name="robots" content="noindex, nofollow, noarchive">\n' +
  '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; ' +
  'style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; ' +
  'connect-src https://erp.141-164-46-88.sslip.io; object-src \'none\'; base-uri \'none\'; form-action \'none\'">');

// 3) 로그인 화면 → 연결 중 / 연결 실패 화면
step = "login-view";
const loginStart = html.indexOf("<!-- 로그인 -->");
const loginEnd = html.indexOf("<!-- 앱 -->");
if (loginStart < 0 || loginEnd < 0) throw new Error("[login-view] 로그인/앱 블록 주석을 찾지 못함");
html = html.slice(0, loginStart) + `<!-- 연결 중 -->
<div id="loadingView" class="hidden min-h-screen flex-col items-center justify-center p-4">
  <p class="text-2xl font-extrabold text-gray-900">ERP System</p>
  <p class="mt-1 text-xs text-gray-500">통합 관리 시스템</p>
  <p class="mt-6 text-sm text-gray-400">연결 중…</p>
</div>

<!-- 연결 실패 -->
<div id="denyView" class="hidden min-h-screen items-center justify-center p-4">
  <div class="w-full max-w-sm rounded-2xl border bg-white p-8 text-center shadow-sm">
    <p class="mb-3 text-3xl">⚠️</p>
    <h1 class="mb-2 text-lg font-bold">연결할 수 없습니다</h1>
    <p id="denyMsg" class="mb-6 whitespace-pre-line text-sm leading-relaxed text-gray-500"></p>
    <button onclick="boot()" class="w-full rounded bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">다시 시도</button>
  </div>
</div>

` + html.slice(loginEnd);

// 4) 로그아웃 버튼 제거 (모바일 헤더 · 사이드바)
step = "logout-buttons";
replaceOnce('<button onclick="doLogout()" class="text-xs text-gray-500">로그아웃</button>', '<span class="w-6"></span>');
replaceOnce(`      <div class="border-t p-2">
        <button onclick="doLogout()" class="w-full rounded px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100">로그아웃</button>
      </div>
`, "");

// 5) 자동 로그인 상수
step = "auto-login-const";
replaceOnce("const sb = window.supabase.createClient(SUPABASE_URL, ANON_KEY);\n",
  `const sb = window.supabase.createClient(SUPABASE_URL, ANON_KEY);

// 단독 사용 중이라 로그인 화면 없이 고정 계정으로 자동 인증한다.
// 인증을 완전히 없앨 수는 없다 — 모든 조회가 이 토큰으로 RLS를 통과하기 때문.
// 여러 명이 쓰게 되면 이 블록을 지우고 로그인 화면을 되살리면 된다.
const AUTO_LOGIN = ${JSON.stringify({ email, password })};
`);

// 6) show() 가 다루는 뷰 목록
step = "show";
replaceOnce('["loginView", "denyView", "appView"]', '["loadingView", "denyView", "appView"]');

// 7) 인증 함수 교체 — doLogin/doSignup/doLogout + boot 앞부분
step = "auth-functions";
const authStart = html.indexOf("/* ===== 인증 ===== */");
const authEndMarker = 'state.companyId = m.company_id; state.role = m.role; state.companyName = m.companies?.name ?? "회사";';
const authEnd = html.indexOf(authEndMarker);
if (authStart < 0 || authEnd < 0) throw new Error("[auth-functions] 인증 블록 앵커를 찾지 못함");
html = html.slice(0, authStart) + `/* ===== 인증 (자동) ===== */
// 저장된 세션이 있으면 그대로 쓰고, 없거나 만료됐으면 고정 계정으로 다시 로그인한다.
async function ensureSession() {
  const { data: { user } } = await sb.auth.getUser();
  if (user) return { user };
  const { data, error } = await sb.auth.signInWithPassword(AUTO_LOGIN);
  if (error) return { error };
  return { user: data.user };
}

async function boot() {
  show("loadingView");
  const { user, error } = await ensureSession();
  if (error || !user) {
    const msg = error?.message ?? "알 수 없는 오류";
    return deny(/fetch|network|Failed/i.test(msg)
      ? \`서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.\\n\\n(\${msg})\`
      : \`자동 로그인에 실패했습니다.\\n\\n(\${msg})\`);
  }
  state.user = user;
  const { data: m, error: mErr } = await sb.from("memberships")
    .select("company_id, role, companies(name)").limit(1).maybeSingle();
  if (mErr) return deny(\`회사 정보를 불러오지 못했습니다.\\n\\n(\${mErr.message})\`);
  if (!m) return deny(\`\${user.email} 계정에 연결된 회사가 없습니다.\`);
  ` + html.slice(authEnd);

// 8) 토큰 만료 시 자동 재로그인
step = "signed-out";
replaceOnce('sb.auth.onAuthStateChange((e) => { if (e === "SIGNED_OUT") show("loginView"); });',
  '// 토큰이 만료돼 로그아웃 상태가 되면 자동으로 다시 로그인한다.\nsb.auth.onAuthStateChange((e) => { if (e === "SIGNED_OUT") boot(); });');

// 9) 남은 참조 검사 — 웹 전용 심볼이 남아 있으면 실패
step = "leftover-check";
for (const bad of ["loginView", "doLogin(", "doSignup(", "doLogout(", "ADMIN_ROLES", "회원가입"]) {
  if (html.includes(bad)) throw new Error(`[leftover-check] 웹 전용 심볼이 남아 있음: ${bad}`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
console.log(`renderer/index.html 생성 완료 (${(html.length / 1024).toFixed(0)} KB) ← ${path.relative(process.cwd(), SRC)}`);
