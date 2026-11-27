import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Docs uploads allow up to 1GB; middleware otherwise buffers only 10MB.
    middlewareClientMaxBodySize: "1gb",
  },
};

export default nextConfig;
