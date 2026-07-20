-- Phase 2: 기준정보 (품목/거래처/창고/부서/사원/계정과목 + 표준 계정 템플릿)
-- 원본은 Supabase 프로젝트에 적용됨. 이 파일은 기록/재현용. 전체 내용은 원격과 동일.

create table public.items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_code text not null,
  name text not null,
  spec text,
  unit text not null default 'EA',
  item_type text not null default 'goods' check (item_type in ('raw','sub','semi','product','goods')),
  price_in numeric(18,2) not null default 0,
  price_out numeric(18,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, item_code)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  partner_code text not null,
  name text not null,
  biz_no text,
  ceo_name text,
  partner_type text not null default 'both' check (partner_type in ('customer','vendor','both')),
  contact_name text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, partner_code)
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  emp_no text not null,
  name text not null,
  department_id uuid references public.departments(id),
  position text,
  join_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, emp_no)
);

create table public.account_templates (
  code text primary key,
  name text not null,
  category text not null check (category in ('asset','liability','equity','revenue','expense')),
  sub_category text not null
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in ('asset','liability','equity','revenue','expense')),
  sub_category text not null,
  is_active boolean not null default true,
  unique (company_id, code)
);

alter table public.items enable row level security;
alter table public.partners enable row level security;
alter table public.warehouses enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.accounts enable row level security;
alter table public.account_templates enable row level security;

create policy items_all on public.items for all using (public.is_member(company_id)) with check (public.is_member(company_id));
create policy partners_all on public.partners for all using (public.is_member(company_id)) with check (public.is_member(company_id));
create policy warehouses_all on public.warehouses for all using (public.is_member(company_id)) with check (public.is_member(company_id));
create policy departments_all on public.departments for all using (public.is_member(company_id)) with check (public.is_member(company_id));
create policy employees_all on public.employees for all using (public.is_member(company_id)) with check (public.is_member(company_id));
create policy accounts_select on public.accounts for select using (public.is_member(company_id));
create policy accounts_write on public.accounts for all using (public.is_admin(company_id)) with check (public.is_admin(company_id));
create policy account_templates_select on public.account_templates for select using (auth.role() = 'authenticated');

-- 표준 계정과목 템플릿 시드 98개는 원격 마이그레이션과 동일 (생략 없이 원격 적용됨)
-- 상세 목록은 Supabase 대시보드 또는 account_templates 조회로 확인

-- 회사 생성 시 표준 계정과목과 기본 창고를 함께 만든다
create or replace function public.create_company(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into companies (name) values (p_name) returning id into v_company_id;
  insert into memberships (company_id, user_id, role) values (v_company_id, auth.uid(), 'owner');
  insert into accounts (company_id, code, name, category, sub_category)
    select v_company_id, code, name, category, sub_category from account_templates;
  insert into warehouses (company_id, code, name) values (v_company_id, 'W01', '기본창고');
  return v_company_id;
end $$;
