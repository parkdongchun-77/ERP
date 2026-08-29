# ERP System (단일 HTML 버전)

Next.js 버전 ERP를 의존성 없는 단일 `index.html`로 재구현한 것입니다.
빌드 과정이 없고 정적 호스팅(Cloudflare Pages, GitHub Pages 등) 어디에나 올릴 수 있습니다.

## 구성

- `index.html` — 전체 앱 (Tailwind CDN + supabase-js CDN, 해시 라우팅)
- 백엔드: 자체 호스팅 Supabase 스택 (Vultr VPS)
  - `https://erp.141-164-46-88.sslip.io`
  - PostgREST로 테이블·뷰 직접 조회, 도메인 규칙은 RPC 호출

## 화면

| 경로 | 화면 |
|---|---|
| `#/` | 대시보드 (KPI·6개월 추이·매출 구성·전표·미수금) |
| `#/items` | 품목 등록·조회 |
| `#/partners` | 거래처 등록·조회 |
| `#/stock` | 현재고 + 안전재고 부족 |
| `#/ledger` | 재고수불부 (기초+입고−출고=기말) |
| `#/sales` | 판매 전표 작성·확정·취소 |
| `#/receipts` | 수금 등록 + 거래처별 미수금 |

## 사용하는 RPC

`create_company`, `next_doc_no`, `confirm_sale`, `cancel_sale`, `stock_ledger`

확정/취소는 서버 RPC로만 수행되므로 재고 차감·자동분개·역분개 규칙이
클라이언트 구현과 무관하게 DB에서 강제됩니다.

## 로컬 실행

```
python -m http.server 8899
```

`http://localhost:8899` 접속. (`file://`로 열면 인증 세션 저장이 동작하지 않습니다.)

## 남은 작업

구매·회계·생산·인사·그룹웨어 화면은 아직 Next.js 버전에만 있습니다.
