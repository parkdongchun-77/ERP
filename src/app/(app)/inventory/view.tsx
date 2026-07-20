// 현재고 목록 클라이언트 뷰 (검색·정렬용 DataTable 사용)
"use client";

import { DataTable, type Column } from "@/components/data-table";

type StockRow = {
  item_code: string;
  item_name: string;
  unit: string;
  warehouse: string;
  qty: number;
};

const columns: Column<StockRow>[] = [
  { key: "item_code", label: "품목코드" },
  { key: "item_name", label: "품목명" },
  { key: "warehouse", label: "창고" },
  {
    key: "qty",
    label: "현재고",
    render: (r) => (
      <span className={r.qty < 0 ? "text-red-600" : ""}>{r.qty.toLocaleString()}</span>
    ),
  },
  { key: "unit", label: "단위" },
];

export function CurrentStockView({ rows }: { rows: StockRow[] }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">현재고</h1>
      <DataTable columns={columns} rows={rows} searchPlaceholder="품목코드/품목명/창고 검색" />
    </div>
  );
}
