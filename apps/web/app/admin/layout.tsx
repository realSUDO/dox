"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Database, ShieldAlert, LayoutDashboard, Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const { data: user, isLoading, isError } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && (isError || !user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [user, isLoading, isError, router]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const links = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/queues", label: "Queues (BullBoard)", icon: Activity },
    { href: "/admin/jobs", label: "Failed Jobs", icon: Database },
    { href: "/admin/guardrails", label: "Guardrails", icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen bg-muted/10 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold tracking-tight">Admin Dashboard</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
