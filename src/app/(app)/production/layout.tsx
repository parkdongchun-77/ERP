// 생산/제조 모듈 레이아웃
import Link from "next/link";

const TABS = [
  { name: "BOM", href: "/production" },
  { name: "작업지시", href: "/production/work-orders" },
];

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
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
