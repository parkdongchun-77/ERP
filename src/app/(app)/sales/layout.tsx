// 영업/판매 모듈 레이아웃. 하위 화면 탭 내비게이션
import Link from "next/link";

const TABS = [
  { name: "견적서", href: "/sales/quotes" },
  { name: "주문서", href: "/sales/orders" },
  { name: "판매(출고)", href: "/sales" },
  { name: "수금/미수금", href: "/sales/receipts" },
  { name: "판매현황", href: "/sales/report" },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-t px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            {t.name}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
