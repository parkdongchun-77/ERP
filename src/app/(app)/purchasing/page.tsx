// 구매(입고) 전표 페이지
import { fetchDocData } from "@/app/(app)/sales/doc-data";
import { DocModule } from "@/app/(app)/sales/doc-module";

export default async function PurchasesPage() {
  const { docRows, partnerOptions, itemOptions, warehouseOptions, error } = await fetchDocData(
    "purchases",
    "purchase_lines",
    "price_in"
  );
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  return (
    <DocModule
      docType="purchase"
      docs={docRows}
      partners={partnerOptions}
      items={itemOptions}
      warehouses={warehouseOptions}
    />
  );
}
