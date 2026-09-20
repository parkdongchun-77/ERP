// 웹 버전(erp-html/index.html)을 원본으로 데스크톱용 renderer/index.html 을 생성한다.
// 화면 코드를 두 벌 관리하지 않기 위해 데스크톱 차이(로컬 번들·CSP·로그인 기억)만 여기서 입힌다.
// 앵커 문자열이 원본에서 사라지면 즉시 실패시켜 조용한 드리프트를 막는다.
// 비밀번호는 어디에도 들어가지 않는다 — 첫 로그인 때 OS 키체인(safeStorage)에 저장된다.
const fs = require("node:fs");
const path = require("node:path");

const SRC = process.argv[2] || path.join(__dirname, "..", "erp-html", "index.html");
const OUT = path.join(__dirname, "renderer", "index.html");

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

// 3) 로그인 안내 문구 — 데스크톱은 한 번만 로그인하면 기억된다
step = "login-hint";
replaceOnce("관리자 전용 페이지입니다.<br>계정은 운영자에게 문의하세요.",
  "처음 한 번만 로그인하면 이 PC에 안전하게 저장됩니다.<br>다음부터는 바로 열립니다.");

// 4) doLogin 성공 시 자격증명 저장, doLogout 시 삭제
step = "login-remember";
replaceOnce(`async function doLogin() {
  const { error } = await sb.auth.signInWithPassword({ email: val("email").trim(), password: val("password") });
  if (error) { $("loginMsg").textContent = error.message; $("loginMsg").classList.remove("hidden"); return; }
  await boot();
}
async function doLogout() { await sb.auth.signOut(); location.hash = ""; show("loginView"); }`,
`async function doLogin() {
  const email = val("email").trim(), password = val("password");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { $("loginMsg").textContent = error.message; $("loginMsg").classList.remove("hidden"); return; }
  // 성공한 자격증명을 OS 키체인에 암호화 저장 → 다음 실행부터 자동 로그인
  try { await window.desktop.setCreds({ email, password }); } catch (e) { toast("로그인 정보 저장 실패: " + e.message, true); }
  await boot();
}
// 로그아웃 = 저장된 로그인 정보도 지운다 (다음 실행 때 로그인 화면)
async function doLogout() { await window.desktop.clearCreds(); await sb.auth.signOut(); location.hash = ""; show("loginView"); }

// 저장된 자격증명으로 조용히 로그인. 비밀번호가 바뀌어 실패하면 저장분을 지우고 로그인 화면으로.
async function tryAutoLogin() {
  const c = await window.desktop.getCreds();
  if (!c) return false;
  const { error } = await sb.auth.signInWithPassword(c);
  if (error) { await window.desktop.clearCreds(); $("loginMsg").textContent = "저장된 로그인 정보가 더 이상 유효하지 않습니다. 다시 로그인하세요."; $("loginMsg").classList.remove("hidden"); return false; }
  return true;
}`);

// 5) boot: 세션이 없으면 로그인 화면 대신 자동 로그인을 먼저 시도
step = "boot-autologin";
replaceOnce(`  const { data: { user } } = await sb.auth.getUser();
  if (!user) return show("loginView");
  state.user = user;`,
`  let { data: { user } } = await sb.auth.getUser();
  if (!user && await tryAutoLogin()) ({ data: { user } } = await sb.auth.getUser());
  if (!user) return show("loginView");
  state.user = user;`);

// 6) 남은 참조 검사
step = "leftover-check";
for (const bad of ["cdn.tailwindcss.com", "cdn.jsdelivr.net", "cdn.sheetjs.com", "회원가입", "AUTO_LOGIN"]) {
  if (html.includes(bad)) throw new Error(`[leftover-check] 남아 있으면 안 되는 문자열: ${bad}`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
console.log(`renderer/index.html 생성 완료 (${(html.length / 1024).toFixed(0)} KB) ← ${path.relative(process.cwd(), SRC)}`);
