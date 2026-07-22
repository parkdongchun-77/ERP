import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 외부 공유(트라이클라우드플레어 터널)에서 dev 자원 요청을 허용
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
