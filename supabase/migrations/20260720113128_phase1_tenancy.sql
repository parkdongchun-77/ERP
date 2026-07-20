-- Phase 1: 멀티테넌시 기반 (companies, memberships, invitations, permissions + RLS)
-- 원본은 Supabase 프로젝트(hhgokwkwzcgoepszmbod)에 apply_migration으로 적용됨. 이 파일은 기록/재현용.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  biz_no text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','member')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin','manager','member')),
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired')),
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null check (role in ('admin','manager','member')),
  module text not null,
  allowed boolean not null default true,
  unique (company_id, role, module)
);

create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from memberships where company_id = cid and user_id = auth.uid()) $$;

create or replace function public.is_admin(cid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from memberships where company_id = cid and user_id = auth.uid() and role in ('owner','admin')) $$;

alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.permissions enable row level security;

create policy companies_select on public.companies for select using (public.is_member(id));
create policy companies_update on public.companies for update using (public.is_admin(id));

create policy memberships_select on public.memberships for select using (public.is_member(company_id));
create policy memberships_insert on public.memberships for insert with check (public.is_admin(company_id));
create policy memberships_update on public.memberships for update using (public.is_admin(company_id));
create policy memberships_delete on public.memberships for delete using (public.is_admin(company_id));

create policy invitations_select on public.invitations for select using (public.is_admin(company_id));
create policy invitations_insert on public.invitations for insert with check (public.is_admin(company_id));
create policy invitations_update on public.invitations for update using (public.is_admin(company_id));
create policy invitations_delete on public.invitations for delete using (public.is_admin(company_id));

create policy permissions_select on public.permissions for select using (public.is_member(company_id));
create policy permissions_write on public.permissions for all using (public.is_admin(company_id)) with check (public.is_admin(company_id));

create or replace function public.create_company(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into companies (name) values (p_name) returning id into v_company_id;
  insert into memberships (company_id, user_id, role) values (v_company_id, auth.uid(), 'owner');
  return v_company_id;
end $$;

create or replace function public.accept_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_inv from invitations where token = p_token and status = 'pending' and expires_at > now();
  if not found then raise exception 'invalid or expired invitation'; end if;
  insert into memberships (company_id, user_id, role) values (v_inv.company_id, auth.uid(), v_inv.role)
    on conflict (company_id, user_id) do nothing;
  update invitations set status = 'accepted' where id = v_inv.id;
  return v_inv.company_id;
end $$;
