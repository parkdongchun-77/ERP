-- 데모 데이터 시드 스크립트
-- 사용법: 앱에서 가입 후 회사를 만든 다음, Supabase 대시보드 SQL Editor에서
--         아래 v_cid에 본인 회사 id(select id from companies)를 넣고 전체 실행.
-- 생성 내용: 품목 5, 거래처 3, 기초재고, BOM 1, 발주→구매 확정 1, 판매 확정 1, 수금 1.

do $$
declare
  v_cid uuid := '00000000-0000-0000-0000-000000000000'; -- ★ 본인 회사 id로 교체
  v_wh uuid; v_cust uuid; v_vend uuid;
  v_prod uuid; v_ma uuid; v_mb uuid; v_goods uuid;
  v_bom uuid; v_po uuid; v_pu uuid; v_sl uuid;
begin
  if not exists (select 1 from companies where id = v_cid) then
    raise exception 'v_cid를 본인 회사 id로 교체하세요';
  end if;
  select id into v_wh from warehouses where company_id = v_cid order by code limit 1;

  -- 품목
  insert into items (company_id, item_code, name, spec, unit, item_type, price_in, price_out, safety_stock) values
    (v_cid, 'A-100', '노트북 거치대', '알루미늄', 'EA', 'goods', 12000, 19900, 20),
    (v_cid, 'A-200', '무선 마우스', '2.4GHz', 'EA', 'goods', 8000, 15000, 30),
    (v_cid, 'P-100', '조립 키보드', '87키', 'EA', 'product', 0, 89000, 10),
    (v_cid, 'M-100', '키보드 기판', 'PCB', 'EA', 'raw', 15000, 0, 0),
    (v_cid, 'M-200', '키캡 세트', 'PBT', 'SET', 'raw', 22000, 0, 0)
  on conflict do nothing;
  select id into v_goods from items where company_id = v_cid and item_code = 'A-100';
  select id into v_prod  from items where company_id = v_cid and item_code = 'P-100';
  select id into v_ma    from items where company_id = v_cid and item_code = 'M-100';
  select id into v_mb    from items where company_id = v_cid and item_code = 'M-200';

  -- 거래처
  insert into partners (company_id, partner_code, name, biz_no, ceo_name, partner_type, phone) values
    (v_cid, 'C-001', '한빛유통', '123-45-67890', '김한빛', 'customer', '02-1234-5678'),
    (v_cid, 'C-002', '두리상사', '234-56-78901', '이두리', 'both', '031-222-3333'),
    (v_cid, 'V-001', '성실부품', '345-67-89012', '박성실', 'vendor', '032-444-5555')
  on conflict do nothing;
  select id into v_cust from partners where company_id = v_cid and partner_code = 'C-001';
  select id into v_vend from partners where company_id = v_cid and partner_code = 'V-001';

  -- 기초재고 (조정)
  insert into stock_movements (company_id, movement_date, item_id, warehouse_id, qty, movement_type, memo) values
    (v_cid, current_date - 30, v_goods, v_wh, 50, 'adjust', '기초재고'),
    (v_cid, current_date - 30, v_ma, v_wh, 40, 'adjust', '기초재고'),
    (v_cid, current_date - 30, v_mb, v_wh, 40, 'adjust', '기초재고');

  -- BOM: 조립 키보드 = 기판 1 + 키캡 1
  insert into boms (company_id, product_item_id) values (v_cid, v_prod) returning id into v_bom;
  insert into bom_lines (company_id, bom_id, material_item_id, qty_per) values
    (v_cid, v_bom, v_ma, 1), (v_cid, v_bom, v_mb, 1);

  -- 발주 → 구매 확정 (무선 마우스 30개)
  select id into v_mb from items where company_id = v_cid and item_code = 'A-200';
  insert into purchase_orders (company_id, doc_no, partner_id)
    values (v_cid, next_doc_no(v_cid, 'purchase_order', 'PO'), v_vend) returning id into v_po;
  insert into purchase_order_lines (company_id, order_id, line_no, item_id, qty, price, supply_amount, vat_amount)
    values (v_cid, v_po, 1, v_mb, 30, 8000, 240000, 24000);
  v_pu := convert_po_to_purchase(v_po);
  perform confirm_purchase(v_pu);

  -- 판매 확정 (거치대 10개) + 수금 일부
  insert into sales (company_id, doc_no, partner_id, warehouse_id)
    values (v_cid, next_doc_no(v_cid, 'sale', 'SL'), v_cust, v_wh) returning id into v_sl;
  insert into sales_lines (company_id, sale_id, line_no, item_id, qty, price, supply_amount, vat_amount)
    values (v_cid, v_sl, 1, v_goods, 10, 19900, 199000, 19900);
  perform confirm_sale(v_sl);
  insert into receipts (company_id, partner_id, amount, method, memo)
    values (v_cid, v_cust, 100000, 'transfer', '일부 수금');

  raise notice '데모 데이터 생성 완료';
end $$;
