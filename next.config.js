/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp, mongoose, and archiver ship native/Node-only code that shouldn't be bundled
  serverExternalPackages: ["sharp", "mongoose", "archiver"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/**/*", "./public/**/*"],
  },
};

module.exports = nextConfig;
