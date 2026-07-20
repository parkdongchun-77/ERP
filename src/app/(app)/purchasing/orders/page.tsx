// 발주서 페이지 (판매 공용 문서 모듈 재사용, 단가는 입고단가 기본)
import { fetchDocData } from "@/app/(app)/sales/doc-data";
import { DocModule } from "@/app/(app)/sales/doc-module";

export default async function PurchaseOrdersPage() {
  const { docRows, partnerOptions, itemOptions, error } = await fetchDocData(
    "purchase_orders",
    "purchase_order_lines",
    "price_in"
  );
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  return <DocModule docType="po" docs={docRows} partners={partnerOptions} items={itemOptions} />;
}
