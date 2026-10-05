-- Phase 11: 금융·세무 데이터 엑셀 반자동 수집 — 은행 거래·카드 승인·세금계산서 적재 테이블 + 전표 생성 RPC
-- 원천별 열 매핑은 import_profiles.column_map 에 저장한다. 재업로드 중복은 (company_id, fingerprint) unique 로 막는다.

create table if not exists import_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null check (kind in ('bank','card','tax')),
  name text not null,
  column_map jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, kind, name)
);

create table if not exists bank_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references import_profiles(id) on delete set null,
  txn_at timestamptz not null,
  deposit numeric(18,0) not null default 0,
  withdrawal numeric(18,0) not null default 0,
  balance numeric(18,0),
  description text,
  memo text,
  partner_id uuid references partners(id) on delete set null,
  journal_entry_id uuid references journal_entries(id) on delete set null,
  status text not null default 'new' check (status in ('new','matched','posted','ignored')),
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (company_id, fingerprint)
);
create index if not exists bank_transactions_cid_at on bank_transactions (company_id, txn_at desc);

create table if not exists card_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references import_profiles(id) on delete set null,
  approved_at timestamptz not null,
  merchant text,
  amount numeric(18,0) not null,
  card_no text,
  approval_no text,
  is_cancel boolean not null default false,
  memo text,
  partner_id uuid references partners(id) on delete set null,
  journal_entry_id uuid references journal_entries(id) on delete set null,
  status text not null default 'new' check (status in ('new','matched','posted','ignored')),
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (company_id, fingerprint)
);
create index if not exists card_transactions_cid_at on card_transactions (company_id, approved_at desc);

create table if not exists tax_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references import_profiles(id) on delete set null,
  direction text not null check (direction in ('purchase','sale')),
  issue_date date not null,
  invoice_no text,
  partner_biz_no text,
  partner_name text,
  supply_amount numeric(18,0) not null default 0,
  tax_amount numeric(18,0) not null default 0,
  total_amount numeric(18,0) not null default 0,
  item_desc text,
  memo text,
  partner_id uuid references partners(id) on delete set null,
  journal_entry_id uuid references journal_entries(id) on delete set null,
  status text not null default 'new' check (status in ('new','matched','posted','ignored')),
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (company_id, fingerprint)
);
create index if not exists tax_invoices_cid_date on tax_invoices (company_id, issue_date desc);

-- RLS: 조회는 멤버, 변경은 관리자
do $$
declare t text;
begin
  foreach t in array array['import_profiles','bank_transactions','card_transactions','tax_invoices'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('create policy %I on %I for select using (is_member(company_id))', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_write', t);
    execute format('create policy %I on %I for all using (is_admin(company_id)) with check (is_admin(company_id))', t || '_write', t);
  end loop;
end $$;

-- 전표 생성: 원본 행 상태 갱신과 같은 트랜잭션. 이미 전기된 행은 거부.
create or replace function post_fin_entry(p_kind text, p_id uuid, p_account text, p_memo text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_cid uuid; v_eid uuid; v_lines jsonb; v_date date; v_desc text; v_partner uuid;
  b bank_transactions%rowtype; c card_transactions%rowtype; t tax_invoices%rowtype;
  v_cash text; v_pay text; v_vat text; v_recv text;
begin
  if p_account is null or p_account = '' then raise exception '계정과목을 선택하세요'; end if;

  if p_kind = 'bank' then
    select * into b from bank_transactions where id = p_id;
    if b.id is null then raise exception '은행 거래를 찾을 수 없습니다'; end if;
    if not is_admin(b.company_id) then raise exception '권한이 없습니다'; end if;
    if b.status = 'posted' then raise exception '이미 전기된 거래입니다'; end if;
    v_cid := b.company_id; v_date := (b.txn_at at time zone 'Asia/Seoul')::date; v_partner := b.partner_id;
    v_desc := coalesce(p_memo, b.description, '은행거래');
    v_cash := mapped_account(v_cid, 'cash_account', '103');
    if b.deposit > 0 then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code', v_cash, 'debit', b.deposit, 'credit', 0, 'memo', b.description),
        jsonb_build_object('account_code', p_account, 'debit', 0, 'credit', b.deposit, 'memo', b.description));
    elsif b.withdrawal > 0 then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code', p_account, 'debit', b.withdrawal, 'credit', 0, 'memo', b.description),
        jsonb_build_object('account_code', v_cash, 'debit', 0, 'credit', b.withdrawal, 'memo', b.description));
    else
      raise exception '입금·출금 금액이 모두 0입니다';
    end if;
    v_eid := create_journal_entry(v_cid, v_date, v_desc, 'bank', b.id, v_lines, v_partner);
    update bank_transactions set journal_entry_id = v_eid, status = 'posted' where id = p_id;

  elsif p_kind = 'card' then
    select * into c from card_transactions where id = p_id;
    if c.id is null then raise exception '카드 내역을 찾을 수 없습니다'; end if;
    if not is_admin(c.company_id) then raise exception '권한이 없습니다'; end if;
    if c.status = 'posted' then raise exception '이미 전기된 내역입니다'; end if;
    if c.amount <= 0 then raise exception '금액이 0입니다'; end if;
    v_cid := c.company_id; v_date := (c.approved_at at time zone 'Asia/Seoul')::date; v_partner := c.partner_id;
    v_desc := coalesce(p_memo, c.merchant, '카드결제') || case when c.is_cancel then ' (취소)' else '' end;
    v_pay := mapped_account(v_cid, 'card_payable', '251');
    if c.is_cancel then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code', v_pay, 'debit', c.amount, 'credit', 0, 'memo', c.merchant),
        jsonb_build_object('account_code', p_account, 'debit', 0, 'credit', c.amount, 'memo', c.merchant));
    else
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code', p_account, 'debit', c.amount, 'credit', 0, 'memo', c.merchant),
        jsonb_build_object('account_code', v_pay, 'debit', 0, 'credit', c.amount, 'memo', c.merchant));
    end if;
    v_eid := create_journal_entry(v_cid, v_date, v_desc, 'card', c.id, v_lines, v_partner);
    update card_transactions set journal_entry_id = v_eid, status = 'posted' where id = p_id;

  elsif p_kind = 'tax' then
    select * into t from tax_invoices where id = p_id;
    if t.id is null then raise exception '세금계산서를 찾을 수 없습니다'; end if;
    if not is_admin(t.company_id) then raise exception '권한이 없습니다'; end if;
    if t.status = 'posted' then raise exception '이미 전기된 세금계산서입니다'; end if;
    if t.total_amount <= 0 then raise exception '합계 금액이 0입니다'; end if;
    v_cid := t.company_id; v_date := t.issue_date; v_partner := t.partner_id;
    v_desc := coalesce(p_memo, t.partner_name, '세금계산서') || coalesce(' ' || t.item_desc, '');
    if t.direction = 'purchase' then
      v_vat := mapped_account(v_cid, 'purchase_vat', '135');
      v_pay := mapped_account(v_cid, 'purchase_payable', '251');
      v_lines := jsonb_build_array(jsonb_build_object('account_code', p_account, 'debit', t.supply_amount, 'credit', 0, 'memo', t.item_desc));
      if t.tax_amount > 0 then
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('account_code', v_vat, 'debit', t.tax_amount, 'credit', 0, 'memo', '부가세'));
      end if;
      v_lines := v_lines || jsonb_build_array(jsonb_build_object('account_code', v_pay, 'debit', 0, 'credit', t.total_amount, 'memo', t.partner_name));
    else
      v_recv := mapped_account(v_cid, 'sale_receivable', '108');
      v_vat := mapped_account(v_cid, 'sale_vat', '255');
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code', v_recv, 'debit', t.total_amount, 'credit', 0, 'memo', t.partner_name),
        jsonb_build_object('account_code', p_account, 'debit', 0, 'credit', t.supply_amount, 'memo', t.item_desc));
      if t.tax_amount > 0 then
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('account_code', v_vat, 'debit', 0, 'credit', t.tax_amount, 'memo', '부가세'));
      end if;
    end if;
    v_eid := create_journal_entry(v_cid, v_date, v_desc, 'tax_invoice', t.id, v_lines, v_partner);
    update tax_invoices set journal_entry_id = v_eid, status = 'posted' where id = p_id;

  else
    raise exception '알 수 없는 종류: %', p_kind;
  end if;
  return v_eid;
end $$;

grant execute on function post_fin_entry(text, uuid, text, text) to authenticated;
