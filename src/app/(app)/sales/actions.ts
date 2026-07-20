// 판매 문서(견적/주문/판매) 저장·삭제·변환·확정·취소와 수금 Server Actions
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DocType = "quote" | "order" | "sale";
export type DocLineInput = { item_id: string; qty: number; price: number };
export type DocInput = {
  id?: string;
  doc_date: string;
  partner_id: string;
  warehouse_id?: string;
  memo?: string;
  lines: DocLineInput[];
};

const CONFIG: Record<
  DocType,
  { table: string; lineTable: string; fk: string; counter: string; prefix: string }
> = {
  quote: { table: "quotes", lineTable: "quote_lines", fk: "quote_id", counter: "quote", prefix: "QT" },
  order: { table: "sales_orders", lineTable: "sales_order_lines", fk: "order_id", counter: "sales_order", prefix: "SO" },
  sale: { table: "sales", lineTable: "sales_lines", fk: "sale_id", counter: "sale", prefix: "SL" },
};

async function ctx() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  return { supabase, cid: data?.company_id as string | undefined };
}

export async function saveDoc(docType: DocType, input: DocInput) {
  const c = CONFIG[docType];
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  if (input.lines.length === 0) return { error: "품목 라인을 1개 이상 입력하세요." };

  const header: Record<string, unknown> = {
    company_id: cid,
    doc_date: input.doc_date,
    partner_id: input.partner_id,
    memo: input.memo || null,
  };
  if (docType === "sale") {
    if (!input.warehouse_id) return { error: "출고 창고를 선택하세요." };
    header.warehouse_id = input.warehouse_id;
  }

  let docId = input.id;
  if (docId) {
    const { error } = await supabase.from(c.table).update(header).eq("id", docId);
    if (error) return { error: error.message };
    const { error: delError } = await supabase.from(c.lineTable).delete().eq(c.fk, docId);
    if (delError) return { error: delError.message };
  } else {
    const { data: docNo, error: noError } = await supabase.rpc("next_doc_no", {
      p_cid: cid,
      p_type: c.counter,
      p_prefix: c.prefix,
    });
    if (noError) return { error: noError.message };
    const { data: created, error } = await supabase
      .from(c.table)
      .insert({ ...header, doc_no: docNo })
      .select("id")
      .single();
    if (error) return { error: error.message };
    docId = created.id;
  }

  const lines = input.lines.map((l, i) => {
    const supply = Math.round(l.qty * l.price * 100) / 100;
    return {
      company_id: cid,
      [c.fk]: docId,
      line_no: i + 1,
      item_id: l.item_id,
      qty: l.qty,
      price: l.price,
      supply_amount: supply,
      vat_amount: Math.round(supply * 0.1),
    };
  });
  const { error: lineError } = await supabase.from(c.lineTable).insert(lines);
  if (lineError) return { error: lineError.message };

  revalidatePath("/sales");
  return { error: null };
}

export async function deleteDoc(docType: DocType, id: string) {
  const c = CONFIG[docType];
  const { supabase } = await ctx();
  const { error } = await supabase.from(c.table).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

export async function convertQuoteToOrder(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("convert_quote_to_order", { p_quote: id });
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

export async function convertOrderToSale(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("convert_order_to_sale", { p_order: id });
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

export async function confirmSale(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("confirm_sale", { p_sale: id });
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

export async function cancelSale(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("cancel_sale", { p_sale: id });
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

export async function saveReceipt(input: {
  partner_id: string;
  receipt_date: string;
  amount: number;
  method: string;
  memo?: string;
}) {
  const { supabase, cid } = await ctx();
  if (!cid) return { error: "소속 회사가 없습니다." };
  if (input.amount <= 0) return { error: "수금액은 0보다 커야 합니다." };
  const { error } = await supabase
    .from("receipts")
    .insert({ ...input, company_id: cid, memo: input.memo || null });
  if (error) return { error: error.message };
  revalidatePath("/sales/receipts");
  return { error: null };
}
