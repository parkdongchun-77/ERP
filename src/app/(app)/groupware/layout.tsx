// 그룹웨어 모듈 레이아웃
import Link from "next/link";

const TABS = [
  { name: "전자결재", href: "/groupware" },
  { name: "게시판", href: "/groupware/board" },
  { name: "일정", href: "/groupware/calendar" },
];

export default function GroupwareLayout({ children }: { children: React.ReactNode }) {
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
