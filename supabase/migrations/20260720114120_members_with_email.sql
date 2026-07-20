-- 멤버 목록에 이메일을 포함해 반환하는 함수 (auth.users는 API로 직접 조회 불가하므로 security definer로 제공)
create or replace function public.members_with_email(cid uuid)
returns table (membership_id uuid, user_id uuid, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_member(cid) then
    raise exception 'not a member of this company';
  end if;
  return query
    select m.id, m.user_id, u.email::text, m.role, m.created_at
    from memberships m
    join auth.users u on u.id = m.user_id
    where m.company_id = cid
    order by m.created_at;
end $$;
