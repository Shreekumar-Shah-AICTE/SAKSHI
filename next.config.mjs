/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Gravity Core uses node:crypto during sealing; keep server components on the Node runtime.
  poweredByHeader: false,
};

export default nextConfig;
