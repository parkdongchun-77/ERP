# Context Notes — 결정 사항과 근거

작업 중 내린 결정을 시간순으로 기록한다. 새 세션은 이 문서를 먼저 읽는다.

## 2026-07-20 (Phase 0)

- 스택 확정: Next.js(App Router) + Supabase + Tailwind + shadcn/ui. 근거는 1인 개발 속도와 RLS 기반 멀티테넌시의 구현 용이성.
- 멀티테넌시: 단일 DB + company_id 컬럼 + RLS 강제. 스키마 분리/DB 분리 방식은 운영 복잡도 대비 이점이 없어 제외.
- 재고 반영 시점: 전표 "확정" 시에만 stock_movements 기록. 임시저장은 미반영. 이카운트도 저장 시 즉시 반영이지만, 오입력 정정 부담을 줄이기 위해 확정 단계를 명시적으로 분리.
- 회계 반영: 판매/구매/수금/지급/급여는 자동분개, 매핑 규칙은 auto_journal_rules 테이블로 관리(하드코딩 금지). 확정 전표는 수정 불가, 역분개로만 취소.
- 수량/금액 타입: numeric(18,4)/numeric(18,2). float 금지.
- 문서번호 채번: 테넌트별 연속 번호, DB 함수(advisory lock 또는 시퀀스 테이블)로 동시성 처리.
- 외부 연동(전자세금계산서/홈택스/POS/쇼핑몰)은 Phase 10~13으로 후순위. 사전 준비(팝빌 계정 등)는 사용자 몫.
- 급여는 요율 테이블 기반 간이 계산. 정식 신고(4대보험/원천세/연말정산)는 범위 외로 확정.
- 리포지토리는 Cowork outputs/erp-system에서 시작. 이후 사용자 로컬 폴더로 이동해 Claude Code에서 이어서 작업 예정.

## 2026-07-20 (Phase 1 진행)

- Supabase 프로젝트 확정: erp-system(hhgokwkwzcgoepszmbod), ap-northeast-2, 무료 플랜. 무료 활성 한도(2개) 때문에 vidflow를 일시정지함(데이터 보존, 복원 가능).
- 테넌시 마이그레이션(phase1_tenancy) 적용. RLS 헬퍼는 security definer 함수(is_member/is_admin)로 memberships 재귀를 회피. 회사 생성과 초대 수락은 RPC(create_company/accept_invitation)로 원자 처리.
- RLS 격리는 SQL 테스트로 검증 완료(사용자 A는 회사 B 데이터 0건).
- 폰트: 템플릿의 Google Fonts(Geist)는 원격 로드 문제로 제거하고 시스템 폰트 스택 사용. 추후 Pretendard 로컬 번들 고려.
- 개발 환경 특이사항: Cowork 마운트 폴더에서는 npm install이 실패해 네이티브 경로(~/build)에서 설치·빌드 후 소스만 동기화하는 방식 사용. Claude Code 로컬 전환 시에는 불필요.
- 인증 UI는 이메일/비밀번호 기반. Supabase 이메일 확인 설정에 따라 가입 직후 세션 유무가 갈리므로 양쪽 모두 처리함.

## 2026-07-20 (Phase 1 잔여분 완료)

- 멤버 초대: 메일 발송 미연동 상태로 토큰 링크(/invite/[token]) 수동 전달 방식. 메일 연동(Resend 등)은 별도 결정.
- 멤버 이메일 목록은 auth.users를 API로 못 읽으므로 security definer 함수 members_with_email(cid)로 제공. 함수 내부에서 is_member 검사.
- 권한별 메뉴: permissions에 allowed=false 행이 있을 때만 숨김(행 없음 = 허용). 관리자 전용 메뉴는 역할로 판단.
- 마이그레이션 SQL을 supabase/migrations/에 버전명 그대로 보관하기로 결정(원본은 원격 적용, 파일은 기록/재현용).
- 샌드박스 egress가 supabase.co를 차단(프록시 403)해 dev 서버 실행·E2E·API 프로브가 이 환경에서 불가. E2E는 스펙만 작성했고 로컬에서 `npx playwright install chromium && npm run test:e2e`로 실행해야 함. E2E 전제는 Auth 이메일 확인 off.
- 가입 직후 세션 생성 여부(이메일 확인 설정)를 원격에서 확인하지 못함. 사용자가 대시보드 Auth 설정에서 확인 필요.

## 미결 사항

- Playwright E2E 로컬 1회 실행으로 인증 흐름 검증(사용자 로컬 환경).
- Supabase Auth 이메일 확인 on/off 정책 결정(개발 중 off 권장, 대시보드에서 설정).
- 초대 메일 발송 연동 여부.
- 서비스명/도메인 미정. 문서번호 접두어 등에 영향 없음(테넌트 설정으로 처리).
