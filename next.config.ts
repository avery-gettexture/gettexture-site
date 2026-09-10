import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Search-indexing guarantee (SPEC §5.1, §16 — search-indexing task, Sep 10
  // 2026). Put `X-Robots-Tag: noindex, nofollow` on the actual HTTP response
  // for every private route. This is the authoritative directive — a crawler
  // sees it without parsing or executing the page. The matching
  // `<meta name="robots">` tags live in app/reading/layout.tsx and
  // app/success/layout.tsx as belt-and-suspenders.
  async headers() {
    return [
      {
        source: "/reading/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/success",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
