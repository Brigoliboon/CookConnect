import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/catalog", destination: "/menu", permanent: true },
      { source: "/catalog/:path*", destination: "/menu/:path*", permanent: true },
      { source: "/en/catalog", destination: "/en/menu", permanent: true },
      { source: "/en/catalog/:path*", destination: "/en/menu/:path*", permanent: true },
      { source: "/ar/catalog", destination: "/ar/menu", permanent: true },
      { source: "/ar/catalog/:path*", destination: "/ar/menu/:path*", permanent: true },
    ];
  },
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

export default withNextIntl(nextConfig);