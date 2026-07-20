-- Phase 4: 영업/판매 (문서 채번, 견적/주문/판매, 확정 시 재고·채권 반영, 수금)
-- 원본은 Supabase 프로젝트에 적용됨(phase4_sales). 이 파일은 기록/재현용.

create table public.doc_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null,
  year int not null,
  last_no int not null default 0,
  primary key (company_id, doc_type, year)
);
alter table public.doc_counters enable row level security;
create policy doc_counters_all on public.doc_counters for all
  using (public.is_member(company_id)) with check (public.is_member(company_id));

create or replace function public.next_doc_no(p_cid uuid, p_type text, p_prefix text)
returns text language plpgsql as $$
declare v_no int; v_year int := extract(year from current_date);
begin
  insert into doc_counters (company_id, doc_type, year, last_no)
  values (p_cid, p_type, v_year, 1)
  on conflict (company_id, doc_type, year)
  do update set last_no = doc_counters.last_no + 1
  returning last_no into v_no;
  return p_prefix || '-' || v_year || '-' || lpad(v_no::text, 4, '0');
end $$;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_no text not null,
  doc_date date not null default current_date,
  partner_id uuid not null references public.partners(id),
  status text not null default 'draft' check (status in ('draft','converted')),
  memo text,
  created_at timestamptz not null default now(),
  unique (company_id, doc_no)
);
create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  line_no int not null,
  item_id uuid not null references public.items(id),
  qty numeric(18,4) not null check (qty > 0),
  price numeric(18,2) not null default 0,
  supply_amount numeric(18,2) not null default 0,
  vat_amount numeric(18,2) not null default 0
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_no text not null,
  doc_date date not null default current_date,
  partner_id uuid not null references public.partners(id),
  status text not null default 'draft' check (status in ('draft','converted')),
  source_quote_id uuid references public.quotes(id),
  memo text,
  created_at timestamptz not null default now(),
  unique (company_id, doc_no)
);
create table public.sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  order_id uuid not null references public.sales_orders(id) on delete cascade,
  line_no int not null,
  item_id uuid not null references public.items(id),
  qty numeric(18,4) not null check (qty > 0),
  price numeric(18,2) not null default 0,
  supply_amount numeric(18,2) not null default 0,
  vat_amount numeric(18,2) not null default 0
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_no text not null,
  doc_date date not null default current_date,
  partner_id uuid not null references public.partners(id),
  warehouse_id uuid not null references public.warehouses(id),
  status text not null default 'draft' check (status in ('draft','confirmed','canceled')),
  source_order_id uuid references public.sales_orders(id),
  memo text,
  created_at timestamptz not null default now(),
  unique (company_id, doc_no)
);
create table public.sales_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  sale_id uuid not null references public.sales(id) on delete cascade,
  line_no int not null,
  item_id uuid not null references public.items(id),
  qty numeric(18,4) not null check (qty > 0),
  price numeric(18,2) not null default 0,
  supply_amount numeric(18,2) not null default 0,
  vat_amount numeric(18,2) not null default 0
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  receipt_date date not null default current_date,
  partner_id uuid not null references public.partners(id),
  amount numeric(18,2) not null check (amount > 0),
  method text not null default 'transfer' check (method in ('cash','transfer','card','note')),
  memo text,
  created_at timestamptz not null default now()
);

alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_lines enable row level security;
alter table public.sales enable row level security;
alter table public.sales_lines enable row level security;
alter table public.receipts enable row level security;

create policy quotes_select on public.quotes for select using (public.is_member(company_id));
create policy quotes_insert on public.quotes for insert with check (public.is_member(company_id));
create policy quotes_update on public.quotes for update using (public.is_member(company_id) and status = 'draft') with check (public.is_member(company_id));
create policy quotes_delete on public.quotes for delete using (public.is_member(company_id) and status = 'draft');
create policy quote_lines_select on public.quote_lines for select using (public.is_member(company_id));
create policy quote_lines_write on public.quote_lines for all
  using (public.is_member(company_id) and exists (select 1 from quotes q where q.id = quote_id and q.status = 'draft'))
  with check (public.is_member(company_id) and exists (select 1 from quotes q where q.id = quote_id and q.status = 'draft'));

create policy sales_orders_select on public.sales_orders for select using (public.is_member(company_id));
create policy sales_orders_insert on public.sales_orders for insert with check (public.is_member(company_id));
create policy sales_orders_update on public.sales_orders for update using (public.is_member(company_id) and status = 'draft') with check (public.is_member(company_id));
create policy sales_orders_delete on public.sales_orders for delete using (public.is_member(company_id) and status = 'draft');
create policy sales_order_lines_select on public.sales_order_lines for select using (public.is_member(company_id));
create policy sales_order_lines_write on public.sales_order_lines for all
  using (public.is_member(company_id) and exists (select 1 from sales_orders o where o.id = order_id and o.status = 'draft'))
  with check (public.is_member(company_id) and exists (select 1 from sales_orders o where o.id = order_id and o.status = 'draft'));

create policy sales_select on public.sales for select using (public.is_member(company_id));
create policy sales_insert on public.sales for insert with check (public.is_member(company_id));
create policy sales_update on public.sales for update using (public.is_member(company_id) and status = 'draft') with check (public.is_member(company_id));
create policy sales_delete on public.sales for delete using (public.is_member(company_id) and status = 'draft');
create policy sales_lines_select on public.sales_lines for select using (public.is_member(company_id));
create policy sales_lines_write on public.sales_lines for all
  using (public.is_member(company_id) and exists (select 1 from sales s where s.id = sale_id and s.status = 'draft'))
  with check (public.is_member(company_id) and exists (select 1 from sales s where s.id = sale_id and s.status = 'draft'));

create policy receipts_select on public.receipts for select using (public.is_member(company_id));
create policy receipts_insert on public.receipts for insert with check (public.is_member(company_id));
create policy receipts_delete on public.receipts for delete using (public.is_member(company_id));

create or replace function public.convert_quote_to_order(p_quote uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_q quotes%rowtype; v_oid uuid;
begin
  select * into v_q from quotes where id = p_quote for update;
  if not found or not public.is_member(v_q.company_id) then raise exception '견적을 찾을 수 없습니다'; end if;
  if v_q.status <> 'draft' then raise exception '이미 변환된 견적입니다'; end if;
  insert into sales_orders (company_id, doc_no, doc_date, partner_id, source_quote_id, memo)
    values (v_q.company_id, next_doc_no(v_q.company_id, 'sales_order', 'SO'), current_date, v_q.partner_id, v_q.id, v_q.memo)
    returning id into v_oid;
  insert into sales_order_lines (company_id, order_id, line_no, item_id, qty, price, supply_amount, vat_amount)
    select company_id, v_oid, line_no, item_id, qty, price, supply_amount, vat_amount
    from quote_lines where quote_id = v_q.id;
  update quotes set status = 'converted' where id = v_q.id;
  return v_oid;
end $$;

create or replace function public.convert_order_to_sale(p_order uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_o sales_orders%rowtype; v_sid uuid; v_wh uuid;
begin
  select * into v_o from sales_orders where id = p_order for update;
  if not found or not public.is_member(v_o.company_id) then raise exception '주문을 찾을 수 없습니다'; end if;
  if v_o.status <> 'draft' then raise exception '이미 변환된 주문입니다'; end if;
  select id into v_wh from warehouses where company_id = v_o.company_id order by (code = 'W01') desc, code limit 1;
  if v_wh is null then raise exception '창고가 없습니다'; end if;
  insert into sales (company_id, doc_no, doc_date, partner_id, warehouse_id, source_order_id, memo)
    values (v_o.company_id, next_doc_no(v_o.company_id, 'sale', 'SL'), current_date, v_o.partner_id, v_wh, v_o.id, v_o.memo)
    returning id into v_sid;
  insert into sales_lines (company_id, sale_id, line_no, item_id, qty, price, supply_amount, vat_amount)
    select company_id, v_sid, line_no, item_id, qty, price, supply_amount, vat_amount
    from sales_order_lines where order_id = v_o.id;
  update sales_orders set status = 'converted' where id = v_o.id;
  return v_sid;
end $$;

create or replace function public.confirm_sale(p_sale uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_s sales%rowtype;
begin
  select * into v_s from sales where id = p_sale for update;
  if not found or not public.is_member(v_s.company_id) then raise exception '판매 전표를 찾을 수 없습니다'; end if;
  if v_s.status <> 'draft' then raise exception '임시저장 상태의 전표만 확정할 수 있습니다'; end if;
  if not exists (select 1 from sales_lines where sale_id = v_s.id) then raise exception '품목 라인이 없습니다'; end if;
  insert into stock_movements (company_id, movement_date, item_id, warehouse_id, qty, movement_type, source_type, source_id)
    select v_s.company_id, v_s.doc_date, l.item_id, v_s.warehouse_id, -l.qty, 'sales_out', 'sale', v_s.id
    from sales_lines l where l.sale_id = v_s.id;
  update sales set status = 'confirmed' where id = v_s.id;
end $$;

create or replace function public.cancel_sale(p_sale uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_s sales%rowtype;
begin
  select * into v_s from sales where id = p_sale for update;
  if not found or not public.is_member(v_s.company_id) then raise exception '판매 전표를 찾을 수 없습니다'; end if;
  if v_s.status <> 'confirmed' then raise exception '확정 상태의 전표만 취소할 수 있습니다'; end if;
  insert into stock_movements (company_id, movement_date, item_id, warehouse_id, qty, movement_type, source_type, source_id, memo)
    select v_s.company_id, current_date, l.item_id, v_s.warehouse_id, l.qty, 'adjust', 'sale_cancel', v_s.id, '판매취소 ' || v_s.doc_no
    from sales_lines l where l.sale_id = v_s.id;
  update sales set status = 'canceled' where id = v_s.id;
end $$;

create view public.partner_receivables
with (security_invoker = true) as
select
  p.company_id,
  p.id as partner_id,
  p.partner_code,
  p.name as partner_name,
  coalesce(st.total, 0) as sales_total,
  coalesce(rt.total, 0) as received_total,
  coalesce(st.total, 0) - coalesce(rt.total, 0) as balance
from partners p
left join (
  select s.company_id, s.partner_id, sum(l.supply_amount + l.vat_amount) as total
  from sales s join sales_lines l on l.sale_id = s.id
  where s.status = 'confirmed'
  group by s.company_id, s.partner_id
) st on st.partner_id = p.id and st.company_id = p.company_id
left join (
  select company_id, partner_id, sum(amount) as total from receipts group by company_id, partner_id
) rt on rt.partner_id = p.id and rt.company_id = p.company_id;
