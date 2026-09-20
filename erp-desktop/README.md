# ERP System — Windows 데스크톱 앱

기존 웹 버전(erp.moahagwon.com)과 같은 화면을 Electron으로 감싼 Windows 프로그램입니다.
화면 코드는 웹 버전과 동일하고, 라이브러리만 로컬에 번들해서 CDN 의존을 없앴습니다.

## 로그인 없이 바로 사용 (v1.1.0)

단독 사용 중이라 로그인 화면을 없앴습니다. 앱을 켜면 바로 대시보드가 뜹니다.

다만 **인증 자체를 없앨 수는 없습니다.** 모든 조회가 로그인 토큰으로 RLS를 통과하는
구조라, 세션이 없으면 전 화면이 빈 값이 됩니다. 그래서 화면만 없애고 기동 시
고정 계정으로 자동 인증하도록 했습니다.

- 계정 정보: `renderer/index.html` 의 `AUTO_LOGIN` 상수
- 토큰이 만료되면 자동으로 다시 로그인합니다
- 서버 연결 실패 시 "연결할 수 없습니다" 화면 + 다시 시도 버튼

### 다시 로그인 화면을 붙이려면

`AUTO_LOGIN` 상수와 `ensureSession()` 을 지우고, `boot()` 이 세션 없을 때
로그인 화면을 띄우도록 되돌리면 됩니다. 웹 버전(erp.moahagwon.com)에는
로그인 화면이 그대로 남아 있으니 그 코드를 가져다 쓰면 됩니다.

**웹 버전은 건드리지 않았습니다.** 공개 도메인이라 자동 로그인을 걸면
주소를 아는 사람이 모두 들어올 수 있기 때문입니다.

## 설치

`dist/ERP-System-Setup-1.1.0.exe` 실행 → 설치 경로 선택 → 완료.
사용자 계정 단위 설치(perMachine=false)라 관리자 권한이 필요 없습니다.
바탕화면·시작 메뉴 바로가기가 만들어집니다.

서명되지 않은 프로그램이라 첫 실행 시 SmartScreen 경고가 나올 수 있습니다.
`추가 정보 → 실행`으로 진행하면 됩니다. 없애려면 코드 서명 인증서가 필요합니다(연 10만원대).

## ⚠️ 이 저장소에 renderer/index.html 이 없는 이유

이 저장소는 **공개(public)** 이고, `renderer/index.html` 에는 `AUTO_LOGIN` 상수로
관리자 이메일·비밀번호가 평문으로 들어 있습니다. 그래서 `.gitignore` 로 제외했습니다.

다시 만들려면 같은 저장소의 `erp-html/index.html` 을 복사한 뒤 두 가지만 바꾸면 됩니다.

1. CDN 스크립트 두 줄을 로컬 경로로 교체
   `https://cdn.tailwindcss.com` → `./vendor/tailwind.js`
   `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` → `./vendor/supabase.js`
2. 로그인 화면을 자동 로그인으로 교체 (아래 "로그인 없이 바로 사용" 절 참고)

`renderer/vendor/` 의 두 파일도 받아야 합니다.
```
curl -o renderer/vendor/tailwind.js https://cdn.tailwindcss.com/3.4.16
curl -o renderer/vendor/supabase.js https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js
```

## 구조

```
main.js              메인 프로세스 (창·메뉴·app:// 프로토콜)
renderer/
  index.html         앱 화면 전체 (웹 버전과 동일)
  vendor/
    tailwind.js      Tailwind 런타임 (로컬 번들)
    supabase.js      supabase-js v2 UMD (로컬 번들)
build/icon.ico       앱 아이콘
smoke-test.js        기동 검증 스크립트
```

## app:// 프로토콜을 쓰는 이유

`file://` 로 로드하면 Chromium이 localStorage 접근을 차단해서 Supabase 세션이
유지되지 않습니다(껐다 켤 때마다 재로그인). 표준·보안 스킴으로 등록한 `app://` 을 쓰면
정상 오리진(`app://erp`)을 갖게 되어 세션이 유지됩니다.

## 메뉴

| 메뉴 | 기능 |
|---|---|
| 파일 | 새로고침(F5), 인쇄(Ctrl+P), 종료 |
| 편집 | 실행취소·복사·붙여넣기·모두선택 |
| 보기 | 확대/축소, 기본 크기, 전체 화면, 개발자 도구(F12) |
| 도움말 | 웹 버전 열기, 정보 |

창 크기와 최대화 상태는 종료 시 저장되어 다음 실행에 복원됩니다.

## 보안

- CSP 적용: 외부 통신은 `erp.141-164-46-88.sslip.io` 로만 허용
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- 외부 링크는 앱 안에서 열리지 않고 기본 브라우저로 넘어감
- 회원가입 없음 — 서버에서도 차단(`DISABLE_SIGNUP=true`)
- 로그인 후 `owner`/`admin` 역할이 아니면 앱 진입 차단

## 검증

`npx electron smoke-test.js` — 20개 항목 전부 통과 확인:
app:// 로딩, 번들 라이브러리, 오리진, localStorage, 로그아웃/로그인,
세션 저장, 대시보드 렌더, 7개 화면 순회, 콘솔 오류 없음.

## 빌드

```
npm install --include=dev      # npmrc 에 omit=dev 가 있어 --include=dev 필요
npx electron .                 # 개발 실행
npx electron-builder --win nsis  # 설치 파일 생성
```

### 빌드 시 알려진 문제

electron-builder가 winCodeSign 캐시를 풀 때 macOS용 심볼릭 링크 2개를 만들지 못해
실패합니다(Windows 개발자 모드가 꺼져 있으면 심볼릭 링크 생성에 권한이 필요).

해결책 둘 중 하나입니다.

1. 설정 → 개인 정보 및 보안 → 개발자용 → **개발자 모드** 켜기 (권장, 영구 해결)
2. 캐시를 수동으로 미리 풀어두기 — 이번 빌드는 이 방법을 썼습니다.
   ```
   7za x -snld -y "-x!darwin" winCodeSign\<id>.7z -o<cache>\winCodeSign-2.6.0
   ```

## 아직 없는 것

자동 업데이트(별도 배포 서버 필요), 코드 서명, 오프라인 동작,
거래명세서 인쇄 양식, 엑셀 업로드/내보내기.
