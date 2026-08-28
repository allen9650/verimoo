/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp and mongoose ship native/Node-only code that shouldn't be bundled
  // for the server components runtime (moved out of `experimental` in Next 15+).
  serverExternalPackages: ["sharp", "mongoose", "archiver"],
};

module.exports = nextConfig;
