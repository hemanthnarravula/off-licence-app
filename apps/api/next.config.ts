import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@off-licence/db", "@off-licence/shared"],
};

export default nextConfig;
