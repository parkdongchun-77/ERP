// Electron 메인 프로세스: 앱 창 생성, app:// 스킴 등록, 한국어 메뉴 구성
const { app, BrowserWindow, Menu, shell, dialog, protocol, net } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const url = require("node:url");
const { registerCredsIpc, clearCreds } = require("./creds");
const { setupUpdater, checkForUpdates } = require("./updater");

const RENDERER_DIR = path.join(__dirname, "renderer");
const STATE_FILE = path.join(app.getPath("userData"), "window-state.json");

// file:// 은 Chromium이 localStorage 접근을 막아 Supabase 세션이 유지되지 않는다.
// 표준·보안 스킴으로 등록한 app:// 을 써서 정상 오리진(app://erp)을 갖게 한다.
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

let mainWindow = null;

function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (Number.isInteger(s.width) && Number.isInteger(s.height)) return s;
  } catch {}
  return { width: 1440, height: 920 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  const state = { ...b, maximized: win.isMaximized() };
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#f9fafb",
    title: "ERP System",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  if (state.maximized) mainWindow.maximize();
  mainWindow.loadURL("app://erp/index.html");
  mainWindow.once("ready-to-show", () => mainWindow.show());

  // 창 제목이 페이지 title 로 덮이지 않도록 고정
  mainWindow.on("page-title-updated", (e) => e.preventDefault());
  mainWindow.on("close", () => saveWindowState(mainWindow));
  mainWindow.on("closed", () => { mainWindow = null; });

  // 외부 링크는 기본 브라우저로
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:/.test(target)) shell.openExternal(target);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (e, target) => {
    if (!target.startsWith("app://")) {
      e.preventDefault();
      if (/^https?:/.test(target)) shell.openExternal(target);
    }
  });

  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    dialog.showErrorBox("오류", `화면 프로세스가 종료되었습니다 (${details.reason}). 앱을 다시 시작해 주세요.`);
  });
}

function buildMenu() {
  const template = [
    {
      label: "파일",
      submenu: [
        { label: "새로고침", accelerator: "F5", click: (_i, w) => w && w.reload() },
        { label: "인쇄…", accelerator: "CmdOrCtrl+P", click: (_i, w) => w && w.webContents.print() },
        { type: "separator" },
        { label: "종료", accelerator: "Alt+F4", role: "quit" },
      ],
    },
    {
      label: "편집",
      submenu: [
        { label: "실행 취소", role: "undo" },
        { label: "다시 실행", role: "redo" },
        { type: "separator" },
        { label: "잘라내기", role: "cut" },
        { label: "복사", role: "copy" },
        { label: "붙여넣기", role: "paste" },
        { label: "모두 선택", role: "selectAll" },
      ],
    },
    {
      label: "보기",
      submenu: [
        { label: "확대", role: "zoomIn" },
        { label: "축소", role: "zoomOut" },
        { label: "기본 크기", role: "resetZoom" },
        { type: "separator" },
        { label: "전체 화면", role: "togglefullscreen" },
        { label: "개발자 도구", accelerator: "F12", role: "toggleDevTools" },
      ],
    },
    {
      label: "도움말",
      submenu: [
        {
          label: "웹 버전 열기",
          click: () => shell.openExternal("https://erp.moahagwon.com/"),
        },
        {
          label: "저장된 로그인 정보 지우기",
          click: async (_i, w) => {
            const { response } = await dialog.showMessageBox(w, {
              type: "question", buttons: ["지우기", "취소"], defaultId: 1, cancelId: 1,
              title: "로그인 정보 삭제", message: "이 PC에 저장된 로그인 정보를 지웁니다.",
              detail: "다음 실행부터 로그인 화면이 다시 나타납니다.",
            });
            if (response === 0) { clearCreds(); w && w.reload(); }
          },
        },
        { type: "separator" },
        { label: "업데이트 확인", click: (_i, w) => checkForUpdates(true, w) },
        {
          label: "정보",
          click: (_i, w) => {
            dialog.showMessageBox(w, {
              type: "info",
              title: "ERP System 정보",
              message: `ERP System ${app.getVersion()}`,
              detail:
                `Electron ${process.versions.electron} · Chromium ${process.versions.chrome}\n` +
                `서버: erp.141-164-46-88.sslip.io\n\n` +
                `관리자(owner·admin) 계정만 사용할 수 있습니다.`,
              buttons: ["확인"],
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 두 번째 실행 시 새 창 대신 기존 창을 띄운다
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // app://erp/... → renderer/ 하위 파일. 상위 경로 탈출은 차단.
    protocol.handle("app", (request) => {
      const { pathname } = new URL(request.url);
      const rel = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html";
      const target = path.join(RENDERER_DIR, rel);
      if (!target.startsWith(RENDERER_DIR)) {
        return new Response("Forbidden", { status: 403 });
      }
      return net.fetch(url.pathToFileURL(target).toString());
    });

    registerCredsIpc();
    buildMenu();
    createWindow();
    setupUpdater(() => mainWindow);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => app.quit());
}
