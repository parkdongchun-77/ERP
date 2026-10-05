-- 회사 정보에 사업자등록·통신판매업신고 항목 추가 (설정 › 회사 정보 화면에서 편집)
alter table companies
  add column if not exists business_type text,        -- 업태
  add column if not exists business_item text,        -- 종목
  add column if not exists opened_at date,            -- 개업일
  add column if not exists registered_at date,        -- 사업자등록일
  add column if not exists tax_office text,           -- 관할 세무서
  add column if not exists mail_order_no text,        -- 통신판매업 신고번호
  add column if not exists mail_order_date date,      -- 통신판매업 신고일
  add column if not exists mail_order_office text;    -- 신고 기관
