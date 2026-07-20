-- 다단계 BOM 전개: 제품 p_qty 생산에 필요한 최종 자재(잎 노드) 소요량 (순환 방지 깊이 20 제한)
create or replace function public.bom_requirements(p_item uuid, p_qty numeric)
returns table (material_item_id uuid, total_qty numeric)
language sql stable security invoker as $$
  with recursive req as (
    select bl.material_item_id, (bl.qty_per * p_qty)::numeric as qty, 1 as depth
    from boms b join bom_lines bl on bl.bom_id = b.id
    where b.product_item_id = p_item
    union all
    select bl2.material_item_id, (bl2.qty_per * r.qty)::numeric, r.depth + 1
    from req r
    join boms b2 on b2.product_item_id = r.material_item_id
    join bom_lines bl2 on bl2.bom_id = b2.id
    where r.depth < 20
  )
  select r.material_item_id, sum(r.qty)
  from req r
  where not exists (select 1 from boms b3 where b3.product_item_id = r.material_item_id)
  group by r.material_item_id
$$;
