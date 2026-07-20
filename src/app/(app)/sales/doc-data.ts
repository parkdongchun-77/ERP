// 판매 문서 화면 공용 데이터 조회 헬퍼 (서버 전용)
import { createClient } from "@/lib/supabase/server";
import type { DocRow, Option } from "./doc-module";

type RawLine = { line_no: number; item_id: string; qty: number; price: number; supply_amount: number; vat_amount: number };
type RawDoc = {
  id: string;
  doc_no: string;
  doc_date: string;
  partner_id: string;
  warehouse_id?: string;
  status: string;
  memo: string | null;
  partners: { name: string } | null;
  lines: RawLine[];
};

export async function fetchDocData(table: string, lineTable: string) {
  const supabase = await createClient();
  const [{ data: docs, error }, { data: partners }, { data: items }, { data: warehouses }] =
    await Promise.all([
      supabase
        .from(table)
        .select(`id, doc_no, doc_date, partner_id, status, memo${table === "sales" ? ", warehouse_id" : ""}, partners(name), lines:${lineTable}(line_no, item_id, qty, price, supply_amount, vat_amount)`)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("partners").select("id, partner_code, name").eq("is_active", true).order("partner_code"),
      supabase.from("items").select("id, item_code, name, price_out").eq("is_active", true).order("item_code"),
      supabase.from("warehouses").select("id, code, name").eq("is_active", true).order("code"),
    ]);

  const docRows: DocRow[] = ((docs ?? []) as unknown as RawDoc[]).map((d) => ({
    id: d.id,
    doc_no: d.doc_no,
    doc_date: d.doc_date,
    partner_id: d.partner_id,
    partner_name: d.partners?.name ?? "?",
    warehouse_id: d.warehouse_id,
    status: d.status,
    memo: d.memo,
    total: d.lines.reduce((s, l) => s + Number(l.supply_amount) + Number(l.vat_amount), 0),
    lines: [...d.lines]
      .sort((a, b) => a.line_no - b.line_no)
      .map((l) => ({ item_id: l.item_id, qty: Number(l.qty), price: Number(l.price) })),
  }));

  const partnerOptions: Option[] = (partners ?? []).map((p) => ({
    id: p.id,
    label: `[${p.partner_code}] ${p.name}`,
  }));
  const itemOptions = (items ?? []).map((i) => ({
    id: i.id,
    label: `[${i.item_code}] ${i.name}`,
    price_out: Number(i.price_out),
  }));
  const warehouseOptions: Option[] = (warehouses ?? []).map((w) => ({ id: w.id, label: w.name }));

  return { docRows, partnerOptions, itemOptions, warehouseOptions, error };
}
