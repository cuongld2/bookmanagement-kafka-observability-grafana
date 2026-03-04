import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_FARO_URL: process.env.NEXT_PUBLIC_FARO_URL,
    NEXT_PUBLIC_FARO_APP_NAME: process.env.NEXT_PUBLIC_FARO_APP_NAME,
    NEXT_PUBLIC_FARO_ENVIRONMENT: process.env.NEXT_PUBLIC_FARO_ENVIRONMENT,
  },
};

export default nextConfig;
