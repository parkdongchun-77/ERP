// BOM 페이지 (제품별 소요 자재 등록·조회)
import { createClient } from "@/lib/supabase/server";
import { BomView } from "./view";

export default async function BomPage() {
  const supabase = await createClient();
  const [{ data: boms, error }, { data: items }] = await Promise.all([
    supabase
      .from("boms")
      .select("id, product_item_id, items!boms_product_item_id_fkey(item_code, name), bom_lines(material_item_id, qty_per)"),
    supabase.from("items").select("id, item_code, name, item_type").eq("is_active", true).order("item_code"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  const itemMap = new Map((items ?? []).map((i) => [i.id, `[${i.item_code}] ${i.name}`]));
  return (
    <BomView
      boms={(boms ?? []).map((b) => ({
        id: b.id,
        product_item_id: b.product_item_id,
        product:
          (b.items as unknown as { item_code: string; name: string } | null)?.name ?? "?",
        lines: ((b.bom_lines as { material_item_id: string; qty_per: number }[]) ?? []).map((l) => ({
          material_item_id: l.material_item_id,
          material: itemMap.get(l.material_item_id) ?? "?",
          qty_per: Number(l.qty_per),
        })),
      }))}
      products={(items ?? [])
        .filter((i) => ["product", "semi"].includes(i.item_type))
        .map((i) => ({ id: i.id, label: `[${i.item_code}] ${i.name}` }))}
      materials={(items ?? []).map((i) => ({ id: i.id, label: `[${i.item_code}] ${i.name}` }))}
    />
  );
}
