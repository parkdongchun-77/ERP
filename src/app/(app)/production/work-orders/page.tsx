// 작업지시 페이지 (생성·완료 처리)
import { createClient } from "@/lib/supabase/server";
import { WorkOrdersView } from "./view";

export default async function WorkOrdersPage() {
  const supabase = await createClient();
  const [{ data: orders, error }, { data: boms }, { data: warehouses }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, doc_no, order_date, order_qty, due_date, status, completed_qty, material_cost, items(item_code, name), warehouses(name)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("boms").select("product_item_id, items!boms_product_item_id_fkey(item_code, name)"),
    supabase.from("warehouses").select("id, name").eq("is_active", true).order("code"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <WorkOrdersView
      orders={(orders ?? []).map((o) => ({
        id: o.id,
        doc_no: o.doc_no,
        order_date: o.order_date,
        order_qty: Number(o.order_qty),
        due_date: o.due_date,
        status: o.status,
        completed_qty: o.completed_qty ? Number(o.completed_qty) : null,
        material_cost: o.material_cost ? Number(o.material_cost) : null,
        item: (o.items as unknown as { item_code: string; name: string } | null)?.name ?? "?",
        warehouse: (o.warehouses as unknown as { name: string } | null)?.name ?? "?",
      }))}
      products={(boms ?? []).map((b) => {
        const item = b.items as unknown as { item_code: string; name: string } | null;
        return { id: b.product_item_id, label: item ? `[${item.item_code}] ${item.name}` : "?" };
      })}
      warehouses={(warehouses ?? []).map((w) => ({ id: w.id, label: w.name }))}
    />
  );
}
