import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
  getToken?: () => Promise<string | null>;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return c({
    url: typeof window !== "undefined" 
      ? (env.NEXT_PUBLIC_API_URL ? `${env.NEXT_PUBLIC_API_URL}/trpc` : "/trpc")
      : (process.env.INTERNAL_API_URL ? `${process.env.INTERNAL_API_URL}/trpc` : (env.NEXT_PUBLIC_API_URL ? `${env.NEXT_PUBLIC_API_URL}/trpc` : "/trpc")),
    async headers() {
      const headers: Record<string, string> = {};
      
      try {
        if (opts?.getToken) {
          const token = await opts.getToken();
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        } else if (typeof window !== "undefined" && (window as any).Clerk?.session) {
           const token = await (window as any).Clerk.session.getToken();
           if (token) {
             headers.Authorization = `Bearer ${token}`;
           }
        }
      } catch (err) {
        console.error("[TRPC] Error getting Clerk token:", err);
      }

      if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("__session");
        if (sessionCookie) {
          headers.cookie = `__session=${sessionCookie.value}`;
        }
      }
      return headers;
    },
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
};
