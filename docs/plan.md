# ERP System — 전체 계획 (Phase 0~13)

한국 중소기업용 멀티테넌트 ERP SaaS. 이카운트를 벤치마크하며, 스택은 Next.js(App Router) + Supabase다.
Phase 순서는 데이터 의존 관계를 따른다. 기반 → 기준정보 → 재고 → 판매/구매 → 회계 → 생산 → 급여 → 그룹웨어 → 외부 연동.

## 모듈 간 핵심 데이터 흐름

- 판매 확정 → stock_movements 출고(−) → 매출채권(+) → 자동분개(외상매출금/매출/부가세예수금)
- 구매 확정 → stock_movements 입고(+) → 매입채무(+) → 자동분개(원재료/부가세대급금/외상매입금)
- 생산 완료 → 제품 입고(+), BOM 자재 출고(−) → 원가 집계
- 수금/지급 → 채권/채무 차감 → 자동분개
- 급여 확정 → 자동분개(급여/예수금/보통예금)
- 전자결재 승인 → 전표 확정 허용(회사 설정 시)

## Phase별 계획

### Phase 1 — 기반 (인증·테넌시·셸)
- 목표: 멀티테넌트 격리가 RLS로 증명되는 기반.
- 핵심 테이블: companies, memberships, permissions, invitations
- 핵심 화면: 가입/로그인, 회사 생성, 멤버 초대, 앱 셸(모듈 트리 사이드바), 공통 데이터 테이블/폼
- 의존: 없음. 이후 전 Phase가 의존.

### Phase 2 — 기준정보
- 목표: 전 전표가 참조하는 마스터 데이터.
- 핵심 테이블: items, partners, warehouses, departments, employees, accounts(계정과목, 표준 시드 약 100개)
- 핵심 화면: 각 CRUD + 품목/거래처 엑셀 대량 업로드(실패 행 사유 반환)
- 의존: Phase 1

### Phase 3 — 재고/유통
- 목표: 수불 이력 단일 원천(stock_movements) 확립.
- 핵심 테이블: stock_movements, stock_adjustments, stock_transfers, item_safety_stock
- 핵심 화면: 현재고(품목×창고), 재고수불부(기초+입고−출고=기말), 재고조정, 창고이동, 부족 재고 위젯
- 의존: Phase 2 (items, warehouses)

### Phase 4 — 영업/판매
- 목표: 견적→주문→판매 문서 흐름과 채권 관리.
- 핵심 테이블: quotes(+lines), sales_orders(+lines), sales(+lines), receivables, receipts(수금)
- 핵심 화면: 문서 3종 입력/변환, 거래명세서 PDF, 미수금 현황, 판매 보고서
- 의존: Phase 3 (확정 시 출고 기록)

### Phase 5 — 구매/발주
- 목표: 판매와 대칭인 매입 흐름. 문서 공통 구조 재사용.
- 핵심 테이블: purchase_orders(+lines), purchases(+lines), payables, payments(지급)
- 핵심 화면: 발주/구매 입력, 발주 대비 미입고 잔량(분할 입고), 미지급금, 구매 보고서
- 의존: Phase 3

### Phase 6 — 경리/회계
- 목표: 복식부기 중심. 앞 Phase 전표의 자동분개.
- 핵심 테이블: journal_entries, journal_lines, auto_journal_rules(매핑 설정)
- 핵심 화면: 일반 전표 입력, 계정별/거래처원장, 합계잔액시산표, 손익계산서, 재무상태표
- 의존: Phase 4, 5 (자동분개 원천). 완료 후 Phase 3~6 정합성 교차 검증(서브에이전트).

### Phase 7 — 생산/제조
- 목표: BOM 기반 자재 차감과 간이 원가.
- 핵심 테이블: boms(+lines, 다단계), work_orders, production_results
- 핵심 화면: BOM 등록/전개, 작업지시, 생산실적(제품+/자재−), 소요량 조회(간이 MRP)
- 의존: Phase 3, (원가 분개는 Phase 6)

### Phase 8 — 인사/급여
- 목표: 요율 테이블 기반 간이 급여. 정식 신고는 범위 외.
- 핵심 테이블: employee_details, attendances, leave_balances, payroll_runs(+lines), payroll_rates(요율)
- 핵심 화면: 사원 상세, 근태/연차, 급여대장 생성, 급여명세서 PDF
- 의존: Phase 2 (employees), Phase 6 (급여 분개)

### Phase 9 — 그룹웨어 + 마무리
- 목표: 전자결재 연동과 전사 대시보드, 전 모듈 스모크 E2E.
- 핵심 테이블: approval_docs, approval_lines(결재선), boards/posts, schedules
- 핵심 화면: 결재함(기안/검토/승인), 게시판, 캘린더, 대시보드(매출/매입/재고부족/미수금/결재대기)
- 의존: Phase 4~6 (결재 대상 전표)

### Phase 10~13 — 외부 연동 (MVP 안정 후)
- 10 전자세금계산서: 팝빌 API, tax_invoices, 발행/수정발행. 사전 준비 = 팝빌 계정.
- 11 홈택스 매입 수집: collected_tax_invoices, 구매 전표 매칭. 사전 준비 = 팝빌 홈택스 서비스.
- 12 POS: 판매 기록형(카드 승인 없음), PaymentProvider 인터페이스 분리. 기존 sales 재사용.
- 13 쇼핑몰: 스마트스토어 커머스API 우선, MallAdapter 패턴, mall_orders → sales_orders.

## ERD 초안 (주요 테이블)

모든 업무 테이블은 company_id를 갖는다(다이어그램에는 대표적으로 표기).

```mermaid
erDiagram
    companies ||--o{ memberships : has
    companies ||--o{ items : has
    companies ||--o{ partners : has
    companies ||--o{ warehouses : has
    companies ||--o{ employees : has
    companies ||--o{ accounts : has

    memberships {
        uuid company_id FK
        uuid user_id FK
        text role
    }
    items {
        uuid company_id FK
        text item_code
        text name
        text item_type
        numeric price_in
        numeric price_out
    }
    partners {
        uuid company_id FK
        text partner_code
        text biz_no
        text partner_type
    }

    items ||--o{ stock_movements : moves
    warehouses ||--o{ stock_movements : at
    stock_movements {
        uuid company_id FK
        uuid item_id FK
        uuid warehouse_id FK
        numeric qty
        text movement_type
        uuid source_doc_id
    }

    partners ||--o{ quotes : from
    quotes ||--o{ sales_orders : converts
    sales_orders ||--o{ sales : converts
    sales ||--o{ sales_lines : has
    sales {
        uuid company_id FK
        uuid partner_id FK
        text doc_no
        text status
        date doc_date
    }
    sales ||--o{ receivables : creates
    receivables ||--o{ receipts : settled_by

    partners ||--o{ purchase_orders : to
    purchase_orders ||--o{ purchases : converts
    purchases ||--o{ purchase_lines : has
    purchases ||--o{ payables : creates
    payables ||--o{ payments : settled_by

    journal_entries ||--o{ journal_lines : has
    journal_entries {
        uuid company_id FK
        text entry_no
        text source_type
        uuid source_doc_id
        text status
    }
    journal_lines {
        uuid company_id FK
        uuid account_id FK
        numeric debit
        numeric credit
    }
    accounts ||--o{ journal_lines : posted_to

    items ||--o{ boms : product
    boms ||--o{ bom_lines : has
    work_orders ||--o{ production_results : produces
    work_orders {
        uuid company_id FK
        uuid item_id FK
        numeric order_qty
        text status
    }

    employees ||--o{ attendances : logs
    payroll_runs ||--o{ payroll_lines : has
    payroll_lines {
        uuid company_id FK
        uuid employee_id FK
        numeric gross
        numeric deduction
        numeric net
    }

    approval_docs ||--o{ approval_lines : routed
    approval_docs {
        uuid company_id FK
        text doc_type
        uuid target_doc_id
        text status
    }
```

## 범위 외 (명시적 제외)
- 4대보험/원천세 정식 전자신고, 연말정산, 부가세 전자신고 — 세무 프로그램 병행 전제.
- 카드 결제 승인(VAN/PG), 국세청 직접 연동 — 각각 Phase 12/10의 사전 준비 확보 후 별도 판단.
- 웹메일, 기업메신저 — 이카운트 부가 서비스 영역으로 제외.
