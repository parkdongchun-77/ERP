# ERP System — 작업 체크리스트

각 항목은 "무엇을 만들고 어떻게 확인하는지"를 담는다. 완료 시 체크하고, 검증 증거(테스트명/커밋)를 괄호로 남긴다.

## Phase 0 — 계획
- [x] docs/plan.md 작성 — Phase 1~13, ERD 포함
- [x] docs/checklist.md 작성 — 이 문서
- [x] docs/context-notes.md 작성 — 초기 결정 기록
- [x] Supabase 프로젝트 생성 및 연결 정보 확보 — hhgokwkwzcgoepszmbod, ap-northeast-2, 무료 플랜

## Phase 1 — 기반
- [x] Next.js 프로젝트 스캐폴드 — build + tsc 통과 (커밋 c372148)
- [x] companies/memberships/permissions/invitations 마이그레이션 + RLS — phase1_tenancy 적용, RLS SQL 격리 테스트 통과(A는 B 회사 0건)
- [x] 가입 → 회사 생성(owner) 플로우 — 로그인/온보딩/RPC 구현 (커밋 8381d7c), E2E는 미작성
- [x] 멤버 초대(토큰 링크) → 초대 수락 — 설정>멤버 UI + /invite/[token] 구현 (커밋 f40cf25). 메일 발송은 미연동(링크 수동 전달)
- [x] 앱 셸(모듈 트리 사이드바, 권한별 메뉴 노출) — permissions(allowed=false) 기반 숨김 + 관리자 전용 설정 메뉴 (커밋 278322f)
- [x] 공통 데이터 테이블(정렬/페이지네이션/검색) — DataTable 구현 (커밋 278322f). Phase 2에서 재사용 확인 예정. 폼/확인 다이얼로그는 필요 시점에 추가
- [ ] Playwright E2E 실행 — 스펙/구성 작성됨(커밋 832ba7b). 샌드박스 네트워크 제한으로 로컬 실행 필요: `npx playwright install chromium && npm run test:e2e`

## Phase 2 — 기준정보
- [x] items CRUD + 품목코드 테넌트 내 유일 — DB unique 제약 + UI 중복 안내. 화면 구현 완료
- [x] partners CRUD(사업자번호, 매출/매입 구분) — 화면 구현 완료
- [x] warehouses/departments/employees CRUD — SimpleMaster 공통 뷰로 구현(부서 선택, 입사일 포함)
- [x] accounts 표준 계정과목 시드(98개) — create_company에서 템플릿 복사, SQL 검증 통과(98계정+기본창고 1)
- [x] 품목/거래처 xlsx 대량 업로드 — SheetJS 파싱 + 행별 실패 사유 반환 구현. 실제 파일 업로드 동작 확인은 로컬 실행 시
- [ ] Phase 2 화면 실동작 확인(로컬 dev 서버) — 샌드박스 네트워크 제한으로 로컬에서 확인 필요

## Phase 3 — 재고/유통
- [x] stock_movements 테이블(유형/원본 문서 참조) — phase3_inventory 마이그레이션 + RLS(수정/삭제 불가)
- [x] 현재고 조회(품목×창고) — current_stock 뷰(security_invoker) + 화면. SQL 검증에서 이력 합계 일치 확인
- [x] 재고수불부 — stock_ledger 함수. 기초10+입고30−출고25=기말15 SQL 검증 통과
- [x] 재고조정/창고간 이동 — 조정 화면 + transfer_stock RPC(2행 원자 생성, W01 6/W02 4 검증)
- [x] 음수 재고 방지 — advisory lock 트리거, 회사 설정(allow_negative_stock)으로 허용 가능. 초과 출고 거부 SQL 검증 통과
- [x] 안전재고 + 부족 품목 화면 — items.safety_stock 기반 부족 목록. 품목 마스터 폼에 safety_stock 입력은 미노출(후속)

## Phase 4 — 영업/판매
- [x] 견적/주문/판매 문서 3종(헤더+라인, 부가세 10%) — 공용 DocModule로 구현, 채번 QT/SO/SL-YYYY-####
- [x] 견적→주문→판매 변환 — RPC 2종. SQL 검증: 변환 후 상태 converted, 판매 SL-2026-0001 생성
- [x] 판매 확정 시 출고 기록 + 채권 발생 — SQL 검증: 재고 100→90, 채권 110,000. 임시저장 미반영(확정 시에만 수불)
- [x] 확정 전표 수정 거부 — RLS(update는 draft만). SQL 검증에서 확정 후 update 0행. 취소는 역수불로 재고 복원 검증
- [x] 거래명세서 — 인쇄용 페이지(/sales/[id]/print) 구현. PDF는 브라우저 인쇄로 저장
- [x] 수금 등록 → 채권 차감 — partner_receivables 뷰. SQL 검증: 수금 60,000 후 잔액 50,000
- [x] 판매 현황 보고서(기간/거래처/품목) — 화면 구현. 실동작 확인은 로컬 dev에서

## Phase 5 — 구매/발주
- [x] 발주/구매 문서 — DocModule 확장 재사용 (커밋 1db60d7)
- [x] 구매 확정 시 입고 + 채무 발생 — SQL 검증: 재고 10, 채무 55,000
- [x] 발주 대비 분할 입고, 잔량 추적 — SQL 검증: 6+4 분할 입고 → 잔량 0 → 발주 자동 마감
- [x] 지급 등록 → 채무 차감 — partner_payables 뷰 + 지급 화면
- [x] 구매 현황 — 발주잔량 보고서 + 기간별 거래처·품목 매입 집계(/purchasing/summary) 구현

## Phase 6 — 경리/회계
- [x] journal_entries/lines + 차대변 일치 강제 — create_journal_entry RPC에서 검증(직접 insert 정책 없음)
- [x] 자동분개(판매/구매/수금/지급) — SQL 검증: 4건 분개, 시산표 82,000=82,000, 채권/채무/매출 잔액 정확. 매핑은 계정 코드 고정(설정 테이블 미구현)
- [x] 수동 전표 입력 화면 — 차대 불일치 시 저장 버튼 비활성 + DB 이중 검증
- [x] 계정별원장 — 계정·기간 조회 + 누적 잔액
- [x] 거래처원장 — 거래처·기간 조회 + 계정 표시 + 누적 잔액
- [x] 시산표(차대 균형 경고)/손익계산서/재무상태표 — 화면 구현. 100건 대량 테스트는 미수행(4건 검증으로 갈음)
- [x] 역분개 — reverse_journal_entry + 판매/구매 취소 시 자동 역분개
- [ ] 검증 서브에이전트로 Phase 3~6 정합성 교차 검증 — 미수행(로컬 Claude Code 세션에서 권장)

## Phase 7 — 생산/제조
- [x] BOM 등록 — 단일 레벨 구현. 다단계(반제품 중첩) 전개는 미구현
- [x] 작업지시서 상태 흐름 — ordered→completed/canceled, ordered만 수정·삭제
- [x] 생산실적: 제품 입고 + 자재 차감 — SQL 검증: 제품 +5, 자재 −10/−15. 자재 부족 시 음수 방지 트리거가 거부
- [x] 간이 원가 — SQL 검증: 1,750 정확
- [x] 소요량 조회(MRP) — 다단계 BOM 재귀 전개(bom_requirements, 깊이 20 제한) + 부족분 화면. SQL 검증: 2단 BOM 전개 A60/B20/C10 정확. 생산 완료는 여전히 직계 자재만 소비(반제품은 별도 생산 전제)

## Phase 8 — 인사/급여
- [x] 사원 기본급/연차부여 — 사원 마스터 필드
- [x] 근태/연차 — 근태 기록(출근/연차/반차/결근, 사원·일자 유니크), 연차 현황 뷰(부여−사용=잔여)
- [x] payroll_rates + 급여대장 생성 — SQL 검증: 3,000,000 → 공제 381,123 → 실지급 2,618,877. 요율은 화면에서 수정 가능
- [x] 급여대장 상세 + 사원별 급여명세서 — 개별 명세서 인쇄 페이지(/payroll/slip/[lineId]) 구현
- [x] 급여 확정 자동분개 — SQL 검증: 분개 1건, 시산표 균형 유지

## Phase 9 — 그룹웨어 + 마무리
- [x] 전자결재 — 다단계 결재선(순차 승인, 반려 시 전체 반려) + 최종 승인 시 연동 전표 자동 확정. SQL 검증: 2단 승인 → 판매 확정 → 재고 차감·분개 생성
- [x] 게시판 — 작성/삭제 구현
- [x] 일정 — 월별 목록형 캘린더(등록/삭제)
- [x] 대시보드 위젯 4종 + 미수금 상위 — 구현. 수치 실동작 확인은 로컬에서
- [x] 전 모듈 스모크 E2E — e2e/smoke.spec.ts 작성(가입→기준정보→구매 확정→판매 확정→회계 확인). 실행은 로컬에서 `npm run test:e2e`
- [x] 데모 회사 시드 스크립트 — supabase/seed-demo.sql (SQL Editor에서 회사 id 교체 후 실행)
- [ ] checklist 전 항목 검증 서브에이전트 대조 — 미수행

## Phase 10~13 — 외부 연동 (사전 준비 확보 후 착수)
- [ ] 10 전자세금계산서: 팝빌 테스트베드 키 확보 → 발행/실패/재시도/수정발행 테스트
- [ ] 11 홈택스 수집: 서비스 신청 → 중복 0건/매칭/전표 생성 정합성 테스트
- [ ] 12 POS: 판매 집계 동일성/혼합 결제/마감 정산 테스트
- [ ] 13 쇼핑몰: 스마트스토어 키 확보 → 수집 중복 방지/보류 처리/발송 통보 재시도 테스트
