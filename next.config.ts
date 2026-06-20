import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/ffmpeg-static/**/*"],
  },
};

export default nextConfig;
