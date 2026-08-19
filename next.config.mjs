/**
 * `NEXT_PUBLIC_BASE_PATH` is set by the GitHub Pages workflow (to "/resume-shortlister")
 * so the site works from a project subpath. Local dev and root-domain hosts leave it
 * unset and behave exactly as before.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export drops the /api route; the browser scores locally instead (see app/page.tsx).
  ...(process.env.STATIC_EXPORT === "true"
    ? { output: "export", images: { unoptimized: true } }
    : {}),
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
