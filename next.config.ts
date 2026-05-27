import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project so it ignores the lockfile
  // at ~/pnpm-lock.yaml in the user's home directory.
  turbopack: {
    root: here,
  },
};

export default nextConfig;
