// 재고/유통 모듈 레이아웃. 하위 화면 탭 내비게이션
import Link from "next/link";

const TABS = [
  { name: "현재고", href: "/inventory" },
  { name: "재고수불부", href: "/inventory/ledger" },
  { name: "재고조정", href: "/inventory/adjust" },
  { name: "창고이동", href: "/inventory/transfer" },
  { name: "안전재고 부족", href: "/inventory/shortage" },
];

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
