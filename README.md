# ERP System

한국 중소기업용 웹 기반 멀티테넌트 ERP SaaS. 이카운트(ecount.com)를 벤치마크했습니다.

기준정보 · 재고/유통 · 영업/판매 · 구매/발주 · 경리/회계(복식부기 자동분개) · 생산/제조(BOM) · 인사/급여 · 그룹웨어(전자결재/게시판/일정) 모듈을 포함합니다.

## 스택

Next.js(App Router) + TypeScript + Tailwind CSS / Supabase(PostgreSQL, Auth, RLS) / Playwright

## 로컬 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

`.env.local`이 필요합니다(리포지토리에 포함되지 않음).

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

Supabase 대시보드 → Authentication → Sign In / Up에서 **Confirm email을 끄면** 가입 직후 바로 로그인됩니다(개발 권장).

## 첫 사용

1. `/login`에서 가입 → 회사 생성(가입자가 owner). 표준 계정과목 98개와 기본창고가 자동 생성됩니다.
2. 데모 데이터가 필요하면 `supabase/seed-demo.sql`을 SQL Editor에서 회사 id만 바꿔 실행하세요.
3. 멤버 초대는 설정 > 멤버 관리에서 초대 링크를 만들어 전달합니다(메일 발송 미연동).

## 테스트

```bash
npx tsc --noEmit        # 타입 검사
npm run build           # 프로덕션 빌드
npx playwright install chromium
npm run test:e2e        # 인증 흐름 + 전 모듈 스모크
```

## 구조

```
src/app/(app)/        인증 필요 화면 (master, inventory, sales, purchasing,
                      accounting, production, payroll, groupware, settings)
src/app/login         로그인/가입, src/app/invite/[token] 초대 수락
src/components/       DataTable, SimpleMaster, Sidebar 등 공용 컴포넌트
src/lib/supabase/     서버/브라우저 클라이언트 헬퍼
supabase/migrations/  마이그레이션 기록(원본은 원격 적용, supabase db pull로 동기화 가능)
docs/                 plan.md, checklist.md, context-notes.md, memory/
e2e/                  Playwright 스펙
```

## 핵심 설계 원칙

- 테넌트 격리는 전부 RLS로 강제(company_id + is_member/is_admin 함수).
- 재고는 stock_movements 수불 이력이 단일 원천. 음수 재고는 트리거가 차단.
- 전표는 확정 시점에만 재고·회계 반영. 확정 후 수정 불가, 취소는 역수불+역분개.
- 회계 전표는 RPC로만 생성되며 차변=대변을 DB에서 강제.
- 자동분개 계정은 설정 > 자동분개 계정에서 회사별 변경 가능.

## 배포 (Vercel 권장)

1. 이 리포지토리를 GitHub에 push.
2. Vercel에서 프로젝트 Import → 환경변수 2개(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) 등록 → Deploy.
3. Supabase Authentication → URL Configuration에 배포 도메인을 Site URL/Redirect URL로 추가.

## 범위 외 (로드맵)

전자세금계산서(팝빌), 홈택스 매입 수집, POS, 쇼핑몰 연동은 docs/plan.md의 Phase 10~13 참조. 4대보험·원천세 정식 신고와 연말정산은 세무 프로그램 병행을 전제로 합니다.
