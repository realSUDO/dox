"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const { data: user, isLoading, isError } = trpc.auth.me.useQuery();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && (isError || !user)) {
      router.replace("/login");
    }
  }, [user, isLoading, isError, router, mounted]);

  if (!mounted || isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBFBFA]">
        <Loader2 className="w-8 h-8 animate-spin text-[#144637]" />
      </div>
    );
  }

  return <>{children}</>;
}
