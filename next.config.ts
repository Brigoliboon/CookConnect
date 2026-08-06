import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bzjgwyvchazazhgassxc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
