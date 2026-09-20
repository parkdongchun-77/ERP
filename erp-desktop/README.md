# ERP System — Windows 데스크톱 앱

웹 버전(erp.moahagwon.com)과 같은 화면을 Electron으로 감싼 Windows 프로그램입니다.
화면 코드는 웹과 동일하고, 라이브러리만 로컬에 번들해서 CDN 의존을 없앴습니다.

## 설치 · 업데이트

최신 설치 파일: https://github.com/parkdongchun-77/ERP/releases/latest

`ERP-System-Setup-<버전>.exe` 실행 → 설치 경로 선택 → 완료.
사용자 계정 단위 설치라 관리자 권한이 필요 없고, 바탕화면·시작 메뉴 바로가기가 생깁니다.

**설치 후에는 자동으로 업데이트됩니다.** 앱이 시작할 때와 6시간마다 GitHub Releases를
확인하고, 새 버전이 있으면 내려받은 뒤 "지금 재시작 / 나중에"를 묻습니다.
도움말 → 업데이트 확인 으로 수동 확인도 됩니다.

서명되지 않은 프로그램이라 첫 설치 때 SmartScreen 경고가 나올 수 있습니다.
`추가 정보 → 실행`으로 진행하면 됩니다.

## 로그인은 처음 한 번만

첫 실행에서 로그인하면 자격증명이 **Windows 자격증명 암호화(DPAPI, Electron safeStorage)** 로
이 PC에 저장되고, 다음부터는 로그인 화면 없이 바로 열립니다.

- 저장 위치: `%APPDATA%\ERP System\creds.bin` (암호화됨, 다른 PC나 Windows 계정에서는 복호화 불가)
- 업데이트 로그: `%APPDATA%\ERP System\updater.log`
- 비밀번호가 바뀌어 자동 로그인이 실패하면 저장분을 지우고 로그인 화면을 다시 띄웁니다
- 로그아웃 버튼 = 저장된 로그인 정보 삭제
- 도움말 → 저장된 로그인 정보 지우기 로도 초기화할 수 있습니다

**설치 파일에는 비밀번호가 들어 있지 않습니다.** 그래서 공개 GitHub Releases 에 올려도 안전하고,
자동 업데이트를 쓸 수 있습니다. (이전 v1.1~1.2 는 비밀번호를 내장해서 배포할 수 없었습니다.)

## 구조

```
main.js              메인 프로세스 (창·메뉴·app:// 프로토콜·업데이터 기동)
preload.js           렌더러에 노출하는 API (creds get/set/clear)
creds.js             safeStorage 로 자격증명 암호화 저장·조회·삭제
updater.js           electron-updater — GitHub Releases 확인·다운로드·재시작 안내
build-renderer.js    웹 원본 → 데스크톱 renderer 생성
release.js           빌드 산출물을 GitHub Release 로 업로드 (gh CLI 사용)
smoke-test.js        기동·로그인·화면 검증 (34개 항목)
renderer/
  index.html         생성 파일 — 저장소에 없음 (아래 참고)
  vendor/            tailwind.js · supabase.js · xlsx.js (로컬 번들, 저장소에 없음)
build/icon.ico       앱 아이콘
```

## renderer/index.html 은 생성 파일입니다

화면 코드를 웹·데스크톱 두 벌로 관리하지 않습니다. 원본은 `erp-html/index.html` 하나이고,
`build-renderer.js` 가 데스크톱 차이만 입혀서 `renderer/index.html` 을 만듭니다.

입히는 차이는 네 가지입니다.

1. CDN 스크립트 3개 → `renderer/vendor/` 로컬 파일
2. CSP 메타 태그 (외부 통신은 ERP 서버로만)
3. 로그인 성공 시 자격증명 저장, 로그아웃 시 삭제
4. 세션이 없으면 로그인 화면 전에 저장된 자격증명으로 자동 로그인 시도

원본에서 앵커 문자열이 사라지면 스크립트가 즉시 실패하므로 조용한 드리프트가 생기지 않습니다.

`renderer/vendor/` 는 아래로 받습니다.
```
curl -o renderer/vendor/tailwind.js https://cdn.tailwindcss.com/3.4.16
curl -o renderer/vendor/supabase.js https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js
curl -o renderer/vendor/xlsx.js     https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js
```

## app:// 프로토콜을 쓰는 이유

`file://` 로 로드하면 Chromium이 localStorage 접근을 차단해서 Supabase 세션이
유지되지 않습니다. 표준·보안 스킴으로 등록한 `app://` 을 쓰면 정상 오리진(`app://erp`)을
갖게 되어 세션이 유지됩니다.

## 보안

- 설치 파일에 비밀번호 없음 (스모크 테스트가 매번 확인)
- 자격증명은 DPAPI 암호화, 디스크에 평문 없음 (스모크 테스트가 확인)
- CSP: 외부 통신은 `erp.141-164-46-88.sslip.io` 로만
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, preload 는 creds 3개 함수만 노출
- 외부 링크는 기본 브라우저로

## 빌드 · 릴리스

```
npm install --include=dev          # .npmrc 에 omit=dev 가 있어 --include=dev 필요
npm start                          # 개발 실행
set ERP_TEST_PASSWORD=...          # 스모크 테스트용 (소스에 두지 않음)
npm test                           # 34개 항목 검증
npm run dist                       # 설치 파일 생성 (dist/)
npm run release                    # dist + GitHub Release 업로드 (gh auth login 필요)
```

`release.js` 는 `latest.yml` · `.exe` · `.blockmap` 세 파일을 올립니다.
`latest.yml` 이 없으면 설치본들이 새 버전을 감지하지 못합니다.

### 빌드 시 알려진 문제

electron-builder 가 winCodeSign 캐시를 풀 때 macOS용 심볼릭 링크 2개를 만들지 못해
실패할 수 있습니다(Windows 개발자 모드가 꺼져 있으면 심볼릭 링크 생성에 권한 필요).
설정 → 개인 정보 및 보안 → 개발자용 → **개발자 모드** 를 켜면 영구 해결됩니다.

## 아직 없는 것

코드 서명(SmartScreen 경고 제거, 연 10만원대 인증서 필요), 오프라인 동작, 멤버 초대 화면.
