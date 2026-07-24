import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@clerk/nextjs", "lucide-react", "sonner", "date-fns"],
  },
};

export default nextConfig;
