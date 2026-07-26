"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "~/trpc/client";
import {
  Menu,
  Search,
  Moon,
  Bell,
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
                ? 'bg-[#e4e2e4] text-[#1b1b1d] font-medium'
                : 'text-[#404945] hover:bg-[#eae7ea]'
            }`}
          >
            <MessageCircle size={18} className={isActive ? "text-[#144637]" : "opacity-70"} />
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
    <div className="bg-[#fcf8fb] text-[#1b1b1d] min-h-screen overflow-hidden font-['Inter',sans-serif]">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#fcf8fb]/80 backdrop-blur-md">
        <div className="flex justify-between items-center w-full px-6 py-2 max-w-[1200px] mx-auto h-16">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="p-2 rounded-lg hover:bg-[#eae7ea] transition-colors text-[#404945]"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-['Geist',sans-serif] text-xl font-bold text-[#144637]">
              {leaf?.name || "Dox Workspace"}
            </h1>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-xl mx-10">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#404945] opacity-70" size={18} />
              <input 
                className="w-full bg-[#f0edef] border-none rounded-full py-2 pl-10 pr-4 text-sm font-medium focus:ring-1 focus:ring-[#144637]/20 transition-all outline-none" 
                placeholder="Search knowledge..." 
                type="text"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-[#eae7ea] transition-colors text-[#404945]">
              <Moon size={24} />
            </button>
            <button className="p-2 rounded-lg hover:bg-[#eae7ea] transition-colors text-[#404945]">
              <Bell size={24} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#144637]/10 flex items-center justify-center overflow-hidden ml-2 font-bold text-[#144637]">
              U
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar (Knowledge Base Drawer) */}
      <aside 
        className={`fixed left-0 top-0 h-full z-40 flex flex-col p-4 bg-[#fcf8fb] border-r border-[#c0c9c3] transition-transform duration-300 ease-in-out w-[280px] pt-20 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-4">
          
          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            <Link 
              href={`/leaf/${leafId}/upload`}
              className={`flex items-center gap-4 p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname.endsWith('/upload') 
                  ? 'bg-[#bbeed2] text-[#3f6e57]' 
                  : 'text-[#404945] hover:bg-[#eae7ea]'
              }`}
            >
              <Database size={24} />
              Knowledge Base
            </Link>
            <Link 
              href={`/leaf/${leafId}/manage`}
              className={`flex items-center gap-4 p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname.endsWith('/manage') 
                  ? 'bg-[#bbeed2] text-[#3f6e57]' 
                  : 'text-[#404945] hover:bg-[#eae7ea]'
              }`}
            >
              <Settings size={24} />
              Manage Leaf
            </Link>
            
            <div className="py-2 px-2">
              <div className="w-full h-px bg-[#c0c9c3]/50"></div>
            </div>

            <Link 
              href={`/leaf/${leafId}`}
              className={`flex items-center gap-4 p-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname === `/leaf/${leafId}` 
                  ? 'bg-[#bbeed2] text-[#3f6e57]' 
                  : 'text-[#404945] hover:bg-[#eae7ea]'
              }`}
            >
              <Plus size={24} />
              New Chat
            </Link>
            
            <ChatList leafId={leafId} currentPath={pathname} />
          </nav>

          {/* Footer Tabs */}
          <div className="mt-auto pt-6 border-t border-[#c0c9c3]/30 flex flex-col gap-2">
            <Link 
              href="#"
              className="flex items-center gap-4 px-4 py-2 text-[#404945] hover:bg-[#eae7ea] rounded-lg text-sm font-medium transition-all"
            >
              <HelpCircle size={24} />
              Help
            </Link>
            <Link 
              href="#"
              className="flex items-center gap-4 px-4 py-2 text-[#404945] hover:bg-[#eae7ea] rounded-lg text-sm font-medium transition-all"
            >
              <MessageSquare size={24} />
              Feedback
            </Link>
          </div>
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
