// 전체 앱의 루트 레이아웃. 한국어 시스템 폰트 스택을 사용한다
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP System",
  description: "중소기업용 웹 기반 ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
