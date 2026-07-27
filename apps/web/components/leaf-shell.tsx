"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "~/components/theme-toggle";
import { trpc } from "~/trpc/client";
import {
  Menu,
  
  
  
  Database,
  History,
  Star,
  Settings,
  FolderX,
  HelpCircle,
  MessageSquare,
  Upload,
  MessageCircle,
  Plus,
} from "lucide-react";

function ChatList({ leafId, currentPath }: { leafId: string, currentPath: string }) {
  const { data: sessions, isLoading } = trpc.chat.listSessions.useQuery({ leafId });

  if (isLoading) {
    return (
      <div className="pt-2 px-4 space-y-3">
        <div className="h-4 bg-[#c0c9c3]/20 rounded w-full animate-pulse"></div>
        <div className="h-4 bg-[#c0c9c3]/20 rounded w-3/4 animate-pulse"></div>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <div className="pt-2 flex flex-col gap-1 max-h-[30vh] overflow-y-auto">
      {sessions.map((session) => {
        const url = `/leaf/${leafId}/chat/${session.id}`;
        const isActive = currentPath === url;
        
        return (
          <Link
            key={session.id}
            href={url}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              isActive
                ? 'bg-[#e4e2e4] text-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <MessageCircle size={18} className={isActive ? "text-primary" : "opacity-70"} />
            <span className="truncate">{session.title || "New Chat"}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function LeafShell({
  leafId,
  children,
}: {
  leafId: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const pathname = usePathname();

  const { data: leaf } = trpc.leafs.get.useQuery({ id: leafId });
  const { data: user } = trpc.auth.me.useQuery();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setDrawerOpen(false);
      } else {
        setDrawerOpen(true);
      }
    };
    
    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen overflow-hidden font-['Inter',sans-serif]">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="flex justify-between items-center w-full px-6 py-2 max-w-[1200px] mx-auto h-16">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-['Geist',sans-serif] text-xl font-bold text-primary">
              {leaf?.name || "Dox Workspace"}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground mr-2 bg-accent/50 px-3 py-1.5 rounded-full" title="Token Balance">
              {user && user.tokenBalance !== undefined 
                ? `${(user.tokenBalance / 1000).toFixed(1)} / 50.0` 
                : "..."}
            </div>
            <ThemeToggle />
            <div className="ml-2">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar (Knowledge Base Drawer) */}
      <aside
        className={`fixed left-0 top-0 h-full z-50 flex flex-col bg-background border-r border-border transition-transform duration-300 ease-in-out w-[280px] ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center px-8 border-b border-border shrink-0 gap-4">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <img src="/dox.svg" alt="Dox" className="w-11 h-11" />
            <span className="font-bold text-3xl tracking-tight">Dox</span>
          </Link>
        </div>

        <div className="flex flex-col h-full p-4 pt-6">

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            <Link 
              href={`/leaf/${leafId}/upload`}
              className={`flex items-center gap-4 p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname.endsWith('/upload') 
                  ? 'bg-[#bbeed2] text-[#3f6e57]' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Database size={24} />
              Knowledge Base
            </Link>
            <div className="relative group cursor-default" title="Coming soon">
              <div className="flex items-center gap-4 p-4 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground/40 group-hover:bg-accent/50 pointer-events-none">
                <Settings size={24} />
                Manage Leaf
              </div>
            </div>
            
            <div className="py-2 px-2">
              <div className="w-full h-px bg-[#c0c9c3]/50"></div>
            </div>

            <Link 
              href={`/leaf/${leafId}`}
              className={`flex items-center gap-4 p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname === `/leaf/${leafId}` 
                  ? 'bg-[#bbeed2] text-[#3f6e57]' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Plus size={24} />
              New Chat
            </Link>
            
            <ChatList leafId={leafId} currentPath={pathname} />
          </nav>
        </div>
      </aside>

      {/* Main Workspace */}
      <main 
        className={`h-screen pt-16 flex flex-col items-start justify-start relative overflow-hidden transition-[padding] duration-300 ease-in-out`}
        style={{ paddingLeft: drawerOpen ? '280px' : '0px' }}
      >
        <div className="w-full h-full flex flex-col relative">
          {children}
        </div>
      </main>
    </div>
  );
}
