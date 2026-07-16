import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@offlicence/shared", "@offlicence/db"],
};

export default nextConfig;
