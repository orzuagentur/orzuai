import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@orzu/secrets"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async headers() {
    const robotTag =
      "noindex, nofollow, noarchive, nosnippet, noimageindex";

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: robotTag },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
