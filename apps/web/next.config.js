const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3RpcnJlZC11bmljb3JuLTI4LmNsZXJrLmFjY291bnRzLmRldiQ",
    NEXT_PUBLIC_API_URL: "https://dox.sud-o.app",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
