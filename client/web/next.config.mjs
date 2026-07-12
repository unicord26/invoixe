/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the raw-TS workspace packages we import.
  transpilePackages: ["@leafx/core", "@leafx/types", "@leafx/ui"],
};

export default nextConfig;
