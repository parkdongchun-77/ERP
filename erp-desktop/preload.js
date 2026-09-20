// 렌더러에 노출할 최소 API: 로그인 정보 저장/조회/삭제 (contextIsolation 유지)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  getCreds: () => ipcRenderer.invoke("creds:get"),
  setCreds: (c) => ipcRenderer.invoke("creds:set", c),
  clearCreds: () => ipcRenderer.invoke("creds:clear"),
});
