// 구매/발주 모듈 레이아웃. 하위 화면 탭 내비게이션
import Link from "next/link";

const TABS = [
  { name: "발주서", href: "/purchasing/orders" },
  { name: "구매(입고)", href: "/purchasing" },
  { name: "지급/미지급", href: "/purchasing/payments" },
  { name: "발주잔량", href: "/purchasing/report" },
];

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
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
