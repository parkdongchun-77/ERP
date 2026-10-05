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

## 2026-07-20 (Phase 2 기준정보)

- 표준 계정과목은 전역 account_templates(98개)에 두고, create_company가 회사별 accounts로 복사. 기본창고(W01)도 함께 생성.
- 기준정보 쓰기 권한은 일단 회원 전체(is_member)로 허용. 역할 세분화(manager 이상 등)는 permissions 기반으로 후속 결정.
- 창고/부서/사원은 SimpleMaster 공통 클라이언트 뷰 + 테이블·컬럼 화이트리스트 서버 액션으로 처리. 품목/거래처는 필드가 많아 전용 뷰.
- 엑셀 업로드는 클라이언트에서 SheetJS(xlsx)로 파싱 → 서버 액션에 행 배열 전달 → 행별 insert로 실패 사유(행 번호 포함) 반환.
- SQL 검증 시 주의: 같은 문장 안에서는 volatile 함수의 삽입 결과가 안 보인다(스냅샷). 검증 쿼리는 문장을 분리할 것.
- 사원 마스터는 기본 필드만(사번/이름/부서/직급/입사일). 급여 관련 상세는 Phase 8에서 확장.

## 2026-07-20 (Phase 3 재고/유통)

- 수불 이력은 insert 전용(RLS에 update/delete 정책 없음). 정정은 반대 부호 조정으로 처리.
- 음수 재고 방지는 before insert 트리거에서 품목×창고 advisory lock 후 잔량 검사. companies.allow_negative_stock=true면 허용.
- 현재고는 current_stock 뷰(security_invoker=true)로 제공. PostgREST에서 뷰는 FK 임베딩이 안 되므로 화면에서 items/warehouses를 별도 조회해 조인.
- 수불부는 stock_ledger(from,to) 함수. 기초 = 기간 이전 합, 기말 = 종료일까지 합. filter 절 집계 사용.
- 재고조정은 실사 방식 대신 ± 직접 입력 방식 채택(더 단순). 기초재고 등록도 조정으로 처리.
- 안전재고는 품목 단위(창고 단위 아님). 품목 폼에 safety_stock 입력 필드 노출은 후속 작업.

## 2026-07-20 (Phase 4 영업/판매)

- 문서번호 채번은 doc_counters upsert(on conflict do update ... returning)로 동시성 안전하게 처리. 연도별 리셋.
- 확정 전표 보호는 이중: RLS(update/delete는 draft만) + 확정/취소는 security definer RPC(내부에서 is_member 검사).
- 라인 테이블 쓰기는 부모 문서가 draft일 때만 허용하는 RLS로 잠금.
- 채권은 별도 잔액 테이블 없이 partner_receivables 뷰(확정 판매 합 − 수금 합)로 계산. 동기화 버그 원천 차단.
- 판매 취소는 confirmed → canceled + 역수불(adjust, source_type=sale_cancel). 취소된 판매는 채권 집계에서 자동 제외.
- 견적/주문/판매 UI는 공용 DocModule 하나로 처리(docType prop). 주문→판매 변환 시 창고는 W01 우선 자동 선택.
- 수정 저장은 라인 전체 삭제 후 재삽입 방식(draft 한정이라 안전).
- 부가세는 공급가액의 10% 고정 반올림. 면세/영세율 구분은 범위 외(필요 시 후속).

## 2026-07-20 (Phase 5~9 일괄 진행)

- Phase 5: 판매 DocModule/actions를 po/purchase 타입으로 확장 재사용. 분할 입고는 "잔량 복사 → draft에서 수량 수정 → 확정" 방식. 잔량 0이면 발주 자동 마감, 취소 시 draft 복귀.
- Phase 6: 전표는 RPC로만 생성(직접 insert 정책 없음)해 차대 일치를 DB에서 강제. confirm_sale/confirm_purchase를 자동분개 포함 버전으로 교체. 수금/지급은 after insert 트리거 분개. 계정 매핑은 코드 고정(108/401/255, 146/135/251, 103, 801/254) — 설정 테이블화는 후속.
- Phase 7: BOM 단일 레벨. complete_work_order가 자재 출고+제품 입고+원가를 원자 처리. 자재 부족은 기존 음수 방지 트리거가 차단.
- Phase 8: 요율 % 테이블 기반 간이 계산. generate_payroll이 요율 기본값 자동 시드. 급여 데이터 RLS는 admin 전용.
- Phase 9: 전자결재는 단일 결재자 간이 모델. 대시보드는 이번달 확정 매출/매입, 재고 부족 수, 결재 대기, 미수금 상위 5.
- 마이그레이션 보관 정책 변경: Phase 5부터는 컨텍스트 절약을 위해 요약본만 리포지토리에 저장. 전체 DDL 원본은 Supabase 마이그레이션 이력에서 확인 가능(대시보드 또는 supabase db pull로 동기화 권장).

## 미결 사항

- Playwright E2E 로컬 1회 실행으로 인증 흐름 검증(사용자 로컬 환경).
- Supabase Auth 이메일 확인 on/off 정책 결정(개발 중 off 권장, 대시보드에서 설정).
- 초대 메일 발송 연동 여부.
- 서비스명/도메인 미정. 문서번호 접두어 등에 영향 없음(테넌트 설정으로 처리).

## 2026-10-05 (Phase 11 금융·세무 데이터 수집 착수)

- 배경: 사용자가 은행·홈택스·카드 자동 수집 광고를 보고 같은 기능을 요청. 완전 자동은 CODEF(공동인증서 스크래핑 API)만 현실적 — 오픈뱅킹·마이데이터는 라이선스 필요. 사용자 선택: **엑셀 반자동 먼저**. 개인사업자, 은행 1곳 + 카드 1~2곳, 홈택스 세금계산서 포함.
- 설계 원칙: 원천(은행/카드/홈택스)별 엑셀 양식이 제각각이라 **열 매핑을 데이터(import_profiles.column_map jsonb)로** 둔다. 헤더 키워드로 자동 인식하고, 실패한 열만 사용자가 지정해 프로필로 저장. 나중에 CODEF가 붙어도 같은 테이블에 insert 만 하면 된다.
- 중복 방지: fingerprint = kind + 일시 + 금액 + 적요/승인번호 를 이어 붙인 텍스트. (company_id, fingerprint) unique. 해시 없이 평문 키로 둔 이유는 디버깅 용이 + 길이 문제 없음.
- 전표 생성은 기존 create_journal_entry 를 SQL 함수 post_fin_entry 에서 호출(원본 행 status 갱신과 같은 트랜잭션). source_type 은 자유 텍스트라 bank/card/tax_invoice 사용.
- 세금계산서 수집은 홈택스 전자세금계산서 목록조회 → 엑셀 양식 기준. 매입/매출은 업로드 시 사용자가 지정(홈택스 파일 자체엔 방향 열이 없음).
- 데스크톱 앱은 같은 index.html 을 쓰므로 별도 작업 없음(build-renderer 재실행만).

## 2026-10-05 (Phase 12 서비스·계정 금고·도메인)

- 요구: "내 도메인들도 추가, 로그인 기능도 추가, 여기서 다 확인 — 통합 ERP". 확인 결과 '로그인 기능' = 서비스별 아이디·비밀번호 금고. 도메인은 Cloudflare 자동 조회 선택.
- 금고 설계: pgcrypto `pgp_sym_encrypt(password, current_setting('app.vault_key'))`. 키는 `alter database postgres set app.vault_key = '…'` 로 DB 롤 설정에만 두고 `/root/erp_vault.key` 에 사본. pg_dump 에는 안 들어가고(ALTER DATABASE SET 은 pg_dumpall 영역) 백업은 어차피 GPG. 키를 잃으면 금고 내용은 복구 불가 — 인수인계 문서에 기록.
- 브라우저는 비밀번호를 vault_get RPC 로 클릭 시에만 받는다. 목록 조회는 secret 컬럼을 select 하지 않는 뷰(vault_list) 를 쓴다.
- Cloudflare 토큰은 Claude 가 아니라 사용자가 ERP 설정 화면에 직접 입력한다(자격증명 입력은 사용자 몫). cron 이 DB 에서 복호화해 쓰므로 토큰이 브라우저로 돌아 나오지 않도록 vault_get 은 label='cloudflare_api_token' 행을 거부한다.
- services 는 자유 서식 메모가 많아 핵심 열만 고정하고 나머지는 notes 로.
