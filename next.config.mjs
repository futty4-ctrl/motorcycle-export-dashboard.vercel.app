/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 外部画像（Supabase Storage / BDS）を next/image で表示するための許可
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "bdsc.jupiter.ac", pathname: "/**" },
      { protocol: "https", hostname: "**.bds.co.jp", pathname: "/**" },
      { protocol: "https", hostname: "**.bds-service.jp", pathname: "/**" },
      { protocol: "https", hostname: "**.bds-net.co.jp", pathname: "/**" },
      { protocol: "https", hostname: "bds-net.co.jp", pathname: "/**" },
    ],
  },
}

export default nextConfig
