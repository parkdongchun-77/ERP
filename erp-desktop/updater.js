// 자동 업데이트: GitHub Releases 의 latest.yml 을 보고 새 버전이 있으면 내려받아 재시작 시 설치한다.
// 실패해도 앱 동작에는 영향이 없어야 하므로 모든 오류는 로그로만 남긴다.
const { app, dialog, Notification } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const path = require("node:path");

const LOG = () => path.join(app.getPath("userData"), "updater.log");
function log(msg) {
  try { fs.appendFileSync(LOG(), `${new Date().toISOString()} ${msg}\n`); } catch {}
}

let checking = false;

function setupUpdater(getWindow) {
  autoUpdater.logger = { info: (m) => log("[info] " + m), warn: (m) => log("[warn] " + m), error: (m) => log("[error] " + m), debug: () => {} };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    log(`update-available ${info.version}`);
    if (Notification.isSupported()) new Notification({ title: "ERP System 업데이트", body: `새 버전 ${info.version} 을 내려받는 중입니다.` }).show();
  });
  autoUpdater.on("update-not-available", (info) => { log(`update-not-available (latest ${info.version})`); });
  autoUpdater.on("error", (err) => { log("error " + (err?.stack || err)); });
  autoUpdater.on("update-downloaded", async (info) => {
    log(`update-downloaded ${info.version}`);
    const w = getWindow();
    const { response } = await dialog.showMessageBox(w, {
      type: "info", buttons: ["지금 재시작", "나중에"], defaultId: 0, cancelId: 1,
      title: "업데이트 준비 완료", message: `ERP System ${info.version} 이 준비되었습니다.`,
      detail: "지금 재시작하면 바로 적용됩니다. '나중에'를 누르면 앱을 종료할 때 설치됩니다.",
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  // 개발 실행(패키징 전)에는 업데이트 서버가 없으므로 건너뛴다
  if (!app.isPackaged) { log("skip: not packaged"); return; }
  setTimeout(() => checkForUpdates(false), 4000);
  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000);
}

// 수동 확인(메뉴) 은 결과를 대화상자로 알려준다
async function checkForUpdates(interactive, win) {
  if (checking) return;
  checking = true;
  try {
    const r = await autoUpdater.checkForUpdates();
    if (interactive && r && !r.isUpdateAvailable) {
      dialog.showMessageBox(win, { type: "info", title: "업데이트 확인", message: "최신 버전을 사용 중입니다.", detail: `현재 ${app.getVersion()}`, buttons: ["확인"] });
    }
  } catch (e) {
    log("check failed " + (e?.message || e));
    if (interactive) dialog.showMessageBox(win, { type: "warning", title: "업데이트 확인", message: "업데이트 서버에 연결하지 못했습니다.", detail: String(e?.message || e), buttons: ["확인"] });
  } finally { checking = false; }
}

module.exports = { setupUpdater, checkForUpdates };
