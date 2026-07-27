const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_c3RpcnJlZC11bmljb3JuLTI4LmNsZXJrLmFjY291bnRzLmRldiQ",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://dox.sud-o.app' : 'http://localhost:8000'),
  },
  transpilePackages: ["@repo/services", "@repo/database", "@repo/trpc"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
