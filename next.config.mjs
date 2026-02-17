/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // BDS（オークション・査定）の画像を next/image で表示するための許可
    remotePatterns: [
      { protocol: "https", hostname: "**.bds-net.co.jp", pathname: "/**" },
      { protocol: "https", hostname: "bds-net.co.jp", pathname: "/**" },
      { protocol: "http", hostname: "**.bds-net.co.jp", pathname: "/**" },
      { protocol: "http", hostname: "bds-net.co.jp", pathname: "/**" },
    ],
  },
}

export default nextConfig
