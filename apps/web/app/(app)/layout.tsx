"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Middleware typically protects the (app) routes, but we can have an explicit check here if we want:
  // If not authenticated, the middleware will redirect to sign-in.
  return <>{children}</>;
}
