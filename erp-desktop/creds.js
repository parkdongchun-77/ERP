// 로그인 정보를 OS 키체인(Windows DPAPI)으로 암호화해 보관·조회·삭제하는 IPC 핸들러
// 설치 파일에는 비밀번호가 들어가지 않는다. 첫 로그인 때 저장하고 이후 자동 로그인에 쓴다.
const { app, ipcMain, safeStorage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const FILE = () => path.join(app.getPath("userData"), "creds.bin");

function getCreds() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const buf = fs.readFileSync(FILE());
    const { email, password } = JSON.parse(safeStorage.decryptString(buf));
    return email && password ? { email, password } : null;
  } catch { return null; }
}
function setCreds({ email, password }) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("이 PC에서는 암호화 저장을 사용할 수 없습니다.");
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), safeStorage.encryptString(JSON.stringify({ email, password })));
}
function clearCreds() {
  try { fs.unlinkSync(FILE()); } catch {}
}

function registerCredsIpc() {
  ipcMain.handle("creds:get", () => getCreds());
  ipcMain.handle("creds:set", (_e, c) => { setCreds(c); return true; });
  ipcMain.handle("creds:clear", () => { clearCreds(); return true; });
}

module.exports = { registerCredsIpc, getCreds, setCreds, clearCreds };
