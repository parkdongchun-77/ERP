// 거래명세서 인쇄 페이지 (확정 판매 전표 기준, 브라우저 인쇄용)
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: sale }, { data: company }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "doc_no, doc_date, memo, partners(name, biz_no, ceo_name, phone), sales_lines(line_no, qty, price, supply_amount, vat_amount, items(item_code, name, spec, unit))"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("companies").select("name, biz_no").limit(1).maybeSingle(),
  ]);
  if (!sale) notFound();

  type Line = {
    line_no: number;
    qty: number;
    price: number;
    supply_amount: number;
    vat_amount: number;
    items: { item_code: string; name: string; spec: string | null; unit: string } | null;
  };
  const partner = sale.partners as unknown as {
    name: string;
    biz_no: string | null;
    ceo_name: string | null;
    phone: string | null;
  } | null;
  const lines = [...((sale.sales_lines as unknown as Line[]) ?? [])].sort(
    (a, b) => a.line_no - b.line_no
  );
  const supplyTotal = lines.reduce((s, l) => s + Number(l.supply_amount), 0);
  const vatTotal = lines.reduce((s, l) => s + Number(l.vat_amount), 0);

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <h1 className="mb-6 text-center text-2xl font-bold tracking-widest">거 래 명 세 서</h1>
      <div className="mb-4 flex justify-between text-sm">
        <div>
          <p>문서번호: {sale.doc_no}</p>
          <p>거래일자: {sale.doc_date}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">공급자: {company?.name}</p>
          {company?.biz_no && <p>사업자번호: {company.biz_no}</p>}
        </div>
      </div>
      <div className="mb-4 rounded border p-3 text-sm">
        <p className="font-medium">공급받는자: {partner?.name}</p>
        <p className="text-gray-600">
          {partner?.biz_no && `사업자번호 ${partner.biz_no}`}
          {partner?.ceo_name && ` · 대표 ${partner.ceo_name}`}
          {partner?.phone && ` · ${partner.phone}`}
        </p>
      </div>
      <table className="w-full border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">No</th>
            <th className="border p-2">품목</th>
            <th className="border p-2">규격</th>
            <th className="border p-2">수량</th>
            <th className="border p-2">단가</th>
            <th className="border p-2">공급가액</th>
            <th className="border p-2">세액</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.line_no}>
              <td className="border p-2 text-center">{l.line_no}</td>
              <td className="border p-2">
                [{l.items?.item_code}] {l.items?.name}
              </td>
              <td className="border p-2">{l.items?.spec}</td>
              <td className="border p-2 text-right">
                {Number(l.qty).toLocaleString()} {l.items?.unit}
              </td>
              <td className="border p-2 text-right">{Number(l.price).toLocaleString()}</td>
              <td className="border p-2 text-right">{Number(l.supply_amount).toLocaleString()}</td>
              <td className="border p-2 text-right">{Number(l.vat_amount).toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-medium">
            <td colSpan={5} className="border p-2 text-center">
              합계
            </td>
            <td className="border p-2 text-right">{supplyTotal.toLocaleString()}</td>
            <td className="border p-2 text-right">{vatTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-right text-lg font-bold">
        총액(부가세 포함): {(supplyTotal + vatTotal).toLocaleString()}원
      </p>
      {sale.memo && <p className="mt-2 text-sm text-gray-500">비고: {sale.memo}</p>}
      <div className="mt-6 text-center print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}
