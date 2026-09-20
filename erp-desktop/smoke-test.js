// 데스크톱 앱 스모크 테스트: app:// 로딩, 번들 라이브러리, localStorage, 로그인, 화면 렌더 검증
const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("node:path");
const url = require("node:url");

const RENDERER_DIR = path.join(__dirname, "renderer");
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const log = [];
const ok = (label, cond, extra = "") => {
  log.push(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? " :: " + extra : ""}`);
  return cond;
};

app.whenReady().then(async () => {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html";
    const target = path.join(RENDERER_DIR, rel);
    if (!target.startsWith(RENDERER_DIR)) return new Response("Forbidden", { status: 403 });
    return net.fetch(url.pathToFileURL(target).toString());
  });

  const win = new BrowserWindow({ width: 1440, height: 920, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });

  // Tailwind 런타임 빌드 안내와 Electron 개발용 경고는 실제 오류가 아니므로 제외
  const IGNORE = [/cdn\.tailwindcss\.com should not be used/i, /Electron Security Warning/i];
  const errors = [];
  win.webContents.on("console-message", (_e, level, message) => {
    if (level >= 2 && !IGNORE.some((re) => re.test(message))) errors.push(message);
  });

  try {
    await win.loadURL("app://erp/index.html");
    ok("app:// 로 index.html 로딩", true);

    const js = (code) => win.webContents.executeJavaScript(code, true);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await wait(2500);

    ok("Tailwind 로컬 번들 적용", await js("!!window.tailwind"));
    ok("supabase-js 로컬 번들 적용",
       await js("!!window.supabase?.createClient && typeof sb === 'object'"));

    // CSP 적용 후에도 Tailwind 스타일이 실제로 먹는지 (버튼 배경색 확인)
    const bg = await js(`getComputedStyle(document.querySelector('#denyView button')).backgroundColor`);
    ok("Tailwind 스타일 실제 적용", bg === "rgb(79, 70, 229)", bg);
    ok("오리진이 app://erp", await js("location.origin") === "app://erp",
       await js("location.origin"));

    // localStorage 가 file:// 처럼 막히지 않는지 (Supabase 세션 유지의 전제)
    const lsOk = await js(`(() => { try { localStorage.setItem('__t','1');
      const v = localStorage.getItem('__t'); localStorage.removeItem('__t'); return v === '1'; }
      catch (e) { return 'ERR: ' + e.message; } })()`);
    ok("localStorage 읽기/쓰기", lsOk === true, String(lsOk));

    ok("로그인 화면·회원가입 없음",
       await js(`!document.getElementById('loginView') && !document.body.innerHTML.includes('회원가입')`));
    ok("로그아웃 버튼 없음",
       await js(`![...document.querySelectorAll('button')].some(b => b.textContent.trim() === '로그아웃')`));

    // 세션을 완전히 비운 뒤에도 자동 로그인으로 복구되는지 (실제 첫 실행 조건).
    // signOut 직후 onAuthStateChange 가 boot() 를 다시 돌리므로 복구 결과만 확인한다.
    await js(`(async () => { await sb.auth.signOut();
      Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
      await boot(); })()`);
    await wait(4000);
    ok("자동 로그인으로 앱 진입", await js(`!document.getElementById('appView').classList.contains('hidden')`));
    ok("로그인한 계정이 admin@erp.local",
       await js(`state.user?.email`) === "admin@erp.local", await js(`state.user?.email`));
    ok("권한이 owner/admin", ["owner", "admin"].includes(await js(`state.role`)), await js(`state.role`));
    ok("세션이 localStorage 에 저장됨",
       await js(`Object.keys(localStorage).some(k => k.startsWith('sb-'))`));

    const dash = await js(`document.querySelector('main').innerText.slice(0, 120)`);
    ok("대시보드 렌더", /매출|매입|미수금/.test(dash), dash.replace(/\s+/g, " ").slice(0, 70));

    // 주요 화면 순회
    for (const [hash, needle] of [["items", "품목"], ["stock", "현재고"], ["sales", "판매"],
                                  ["journal", "전표"], ["reports", "시산표"], ["payroll", "급여"],
                                  ["approvals", "결재"]]) {
      await js(`location.hash = '#/${hash}'`);
      await wait(1800);
      const txt = await js(`document.querySelector('main').innerText`);
      ok(`화면 #/${hash}`, txt.includes(needle) && !txt.includes("불러오는 중"),
         txt.replace(/\s+/g, " ").slice(0, 45));
    }

    ok("콘솔 오류 없음", errors.length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) {
    log.push("FAIL  예외: " + (e && e.message));
  }

  console.log("\n=== 스모크 테스트 결과 ===");
  log.forEach((l) => console.log(l));
  const failed = log.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${log.length - failed}/${log.length} 통과`);
  app.exit(failed === 0 ? 0 : 1);
});
