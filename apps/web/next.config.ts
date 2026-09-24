import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // CSP 本体は inline script の nonce 設計が要るため入れていない（この 3 つまで）。
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // このアプリを iframe に入れる正当な経路は無い
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
