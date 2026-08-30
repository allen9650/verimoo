/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native packages that should be excluded from webpack/turbopack bundling
  serverExternalPackages: ["@resvg/resvg-js", "sharp", "mongoose", "archiver"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/**/*", "./public/**/*"],
  },
};

module.exports = nextConfig;
