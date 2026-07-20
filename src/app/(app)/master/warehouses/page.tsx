// 창고 마스터 페이지
import { createClient } from "@/lib/supabase/server";
import { SimpleMaster } from "@/components/simple-master";

export default async function WarehousesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, code, name")
    .order("code");
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  return (
    <SimpleMaster
      title="창고"
      table="warehouses"
      fields={[
        { key: "code", label: "창고코드", required: true, width: "w-24" },
        { key: "name", label: "창고명", required: true, width: "w-40" },
      ]}
      rows={data ?? []}
    />
  );
}
