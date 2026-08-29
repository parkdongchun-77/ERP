# ERP System (단일 HTML 버전)

Next.js 버전 ERP를 의존성 없는 단일 `index.html`로 재구현한 것입니다.
빌드 과정이 없고 정적 호스팅(Cloudflare Pages, GitHub Pages 등) 어디에나 올릴 수 있습니다.

라이브: https://erp-app.141-164-46-88.sslip.io

## 구성

- `index.html` — 전체 앱 (Tailwind CDN + supabase-js CDN, 해시 라우팅)
- 백엔드: 자체 호스팅 Supabase 스택 (Vultr VPS) `https://erp.141-164-46-88.sslip.io`
- PostgREST로 테이블·뷰 직접 조회, 도메인 규칙은 전부 RPC 호출

## 화면 (23개)

| 그룹 | 경로 | 화면 |
|---|---|---|
| — | `#/` | 대시보드 (KPI 5종·6개월 추이·매출 구성·전표·미수금·일정) |
| 기준정보 | `#/items` `#/partners` `#/warehouses` `#/departments` `#/employees` `#/accounts` | 품목·거래처·창고·부서·사원·계정과목 |
| 재고 | `#/stock` `#/ledger` `#/adjust` `#/transfer` | 현재고·수불부·재고조정·창고이동 |
| 판매 | `#/quotes` `#/orders` `#/sales` `#/receipts` | 견적·주문·판매·수금 |
| 구매 | `#/po` `#/purchases` `#/payments` `#/purchase-summary` | 발주·구매·지급·구매현황 |
| 회계 | `#/journal` `#/reports` `#/partner-ledger` | 전표·재무보고서·거래처원장 |
| 생산 | `#/bom` `#/work-orders` `#/mrp` | BOM·작업지시·소요량 |
| 인사 | `#/payroll` | 급여대장·공제요율 |
| 그룹웨어 | `#/approvals` `#/board` `#/calendar` | 전자결재·게시판·일정 |

## 사용하는 RPC

`create_company`, `next_doc_no`, `stock_ledger`, `transfer_stock`,
`convert_quote_to_order`, `convert_order_to_sale`, `confirm_sale`, `cancel_sale`,
`convert_po_to_purchase`, `confirm_purchase`, `cancel_purchase`,
`create_journal_entry`, `reverse_journal_entry`, `trial_balance`,
`bom_requirements`, `complete_work_order`,
`generate_payroll`, `confirm_payroll`,
`members_with_email`, `request_approval`, `decide_approval`

확정·취소·채번·급여·생산완료는 전부 서버 RPC로만 수행됩니다. 재고 차감, 자동분개,
차대 일치, 음수 재고 방지 같은 규칙이 클라이언트 구현과 무관하게 DB에서 강제됩니다.

## 검증 완료 항목 (실데이터)

- 견적 QT-0001 → 주문 SO-0001 → 판매 SL-0002 변환 체인
- 판매 확정 시 A-100 재고 40 → 37, 미수금 118,900 → 184,570
- 작업지시 완료 시 자재 M-100/M-200 각 40 → 35, 완제품 P-100 0 → 5, 자재원가 185,000
- 급여대장 3명 11,300,000 → 공제 1,435,564 (12.7041%) → 실지급 9,864,436, 확정 시 급여 분개 생성
- 전자결재 승인 시 연동 판매 전표 SL-0003 자동 확정
- 시산표 차변 11,981,570 = 대변 11,981,570, 자산 = 부채 + 자본

## 로컬 실행

```
python -m http.server 8899
```

`http://localhost:8899` 접속. (`file://`로 열면 인증 세션 저장이 동작하지 않습니다.)

## 아직 없는 것

거래명세서 인쇄, 엑셀 업로드, 근태·연차, 급여명세서 상세, 멤버 초대,
자동분개 계정 매핑 설정 화면은 Next.js 버전에만 있습니다.
