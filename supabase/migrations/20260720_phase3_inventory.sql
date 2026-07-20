-- Phase 3: 재고/유통 (수불 이력 단일 원천, 음수 재고 방지, 현재고 뷰, 수불부/이동 함수)
-- 원본은 Supabase 프로젝트에 적용됨(phase3_inventory). 이 파일은 기록/재현용.

alter table public.items add column safety_stock numeric(18,4) not null default 0;
alter table public.companies add column allow_negative_stock boolean not null default false;

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  movement_date date not null default current_date,
  item_id uuid not null references public.items(id),
  warehouse_id uuid not null references public.warehouses(id),
  qty numeric(18,4) not null check (qty <> 0),
  movement_type text not null check (movement_type in
    ('purchase_in','sales_out','production_in','material_out','adjust','transfer_in','transfer_out')),
  source_type text,
  source_id uuid,
  memo text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_movements_item_wh on public.stock_movements (company_id, item_id, warehouse_id, movement_date);

alter table public.stock_movements enable row level security;
create policy stock_movements_select on public.stock_movements for select using (public.is_member(company_id));
create policy stock_movements_insert on public.stock_movements for insert with check (public.is_member(company_id));

create or replace function public.check_stock_balance()
returns trigger language plpgsql as $$
declare v_balance numeric; v_allow boolean;
begin
  if new.qty >= 0 then return new; end if;
  select allow_negative_stock into v_allow from companies where id = new.company_id;
  if v_allow then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.item_id::text || new.warehouse_id::text));
  select coalesce(sum(qty), 0) into v_balance
    from stock_movements
    where company_id = new.company_id and item_id = new.item_id and warehouse_id = new.warehouse_id;
  if v_balance + new.qty < 0 then
    raise exception '재고가 부족합니다 (현재고 %, 요청 %)', v_balance, abs(new.qty);
  end if;
  return new;
end $$;

create trigger stock_movements_balance_check
  before insert on public.stock_movements
  for each row execute function public.check_stock_balance();

create view public.current_stock
with (security_invoker = true) as
select sm.company_id, sm.item_id, sm.warehouse_id, sum(sm.qty) as qty
from stock_movements sm
group by sm.company_id, sm.item_id, sm.warehouse_id;

create or replace function public.stock_ledger(p_from date, p_to date)
returns table (
  item_id uuid, item_code text, item_name text, unit text,
  opening numeric, in_qty numeric, out_qty numeric, closing numeric
) language sql stable security invoker as $$
  select
    i.id, i.item_code, i.name, i.unit,
    coalesce(sum(sm.qty) filter (where sm.movement_date < p_from), 0),
    coalesce(sum(sm.qty) filter (where sm.movement_date between p_from and p_to and sm.qty > 0), 0),
    coalesce(abs(sum(sm.qty) filter (where sm.movement_date between p_from and p_to and sm.qty < 0)), 0),
    coalesce(sum(sm.qty) filter (where sm.movement_date <= p_to), 0)
  from items i
  left join stock_movements sm on sm.item_id = i.id
  group by i.id, i.item_code, i.name, i.unit
  having count(sm.id) > 0
  order by i.item_code
$$;

create or replace function public.transfer_stock(
  p_item uuid, p_from_wh uuid, p_to_wh uuid, p_qty numeric, p_date date, p_memo text default null
) returns void language plpgsql security invoker as $$
declare v_cid uuid;
begin
  if p_qty <= 0 then raise exception '이동 수량은 0보다 커야 합니다'; end if;
  if p_from_wh = p_to_wh then raise exception '출발 창고와 도착 창고가 같습니다'; end if;
  select company_id into v_cid from memberships where user_id = auth.uid() limit 1;
  if v_cid is null then raise exception '소속 회사가 없습니다'; end if;
  insert into stock_movements (company_id, movement_date, item_id, warehouse_id, qty, movement_type, memo)
    values (v_cid, p_date, p_item, p_from_wh, -p_qty, 'transfer_out', p_memo);
  insert into stock_movements (company_id, movement_date, item_id, warehouse_id, qty, movement_type, memo)
    values (v_cid, p_date, p_item, p_to_wh, p_qty, 'transfer_in', p_memo);
end $$;
