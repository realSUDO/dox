"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { trpc } from "~/trpc/client";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Plus, 
  Home, 
  Trash2, 
  Settings, 
  CreditCard, 
  MoreVertical, 
  FileText,
  Search,
  LayoutGrid
} from "lucide-react";
import { ThemeToggle } from "~/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: leafs, isLoading } = trpc.leafs.list.useQuery();
  const { data: user } = trpc.auth.me.useQuery();

  const createMutation = trpc.leafs.create.useMutation({
    onSuccess: (data) => {
      toast.success("Leaf created successfully!");
      setName("");
      setDescription("");
      setIsDialogOpen(false);
      utils.leafs.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create leaf");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description: description || undefined });
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-['Inter',sans-serif] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[280px] border-r border-border bg-background flex flex-col h-full flex-shrink-0">
        <div className="h-20 px-8 border-b border-border flex items-center gap-4 shrink-0">
          <img src="/dox.svg" alt="Dox" className="w-11 h-11" />
          <span className="font-bold text-3xl tracking-tight">Dox</span>
        </div>

        <div className="flex flex-col h-full p-4 pt-6">
          <nav className="flex-1 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-4 p-4 bg-[#bbeed2] text-[#3f6e57] rounded-lg font-medium text-sm transition-colors">
              <Home size={24} />
              Home
            </Link>
            <Link href="#" className="flex items-center gap-4 p-4 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg font-medium text-sm transition-colors">
              <Trash2 size={24} />
              Trash
            </Link>
            <Link href="#" className="flex items-center gap-4 p-4 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg font-medium text-sm transition-colors">
              <Settings size={24} />
              Settings
            </Link>
            <Link href="#" className="flex items-center gap-4 p-4 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg font-medium text-sm transition-colors">
              <CreditCard size={24} />
              Billing
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">My Workspace</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                {user && user.tokenBalance !== undefined 
                  ? `${(user.tokenBalance / 1000).toFixed(1)} / 50.0 Credits` 
                  : "..."}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-background/50">
        {/* Top Header */}
        <header className="h-[72px] border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <img src="/leaf.svg" alt="Leaf" className="w-5 h-5 opacity-90" />
            <span className="font-semibold text-foreground tracking-tight">Leafs</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search leafs..." 
                className="pl-9 pr-4 py-2 bg-accent/30 hover:bg-accent/50 border border-border/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-[280px]"
              />
            </div>
            <ThemeToggle />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                  <Plus size={16} />
                  New Leaf
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create a new leaf</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Leaf Name</label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Marketing Strategy 2026"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="desc" className="text-sm font-medium">Description (Optional)</label>
                    <Input
                      id="desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this leaf about?"
                    />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90">
                      {createMutation.isPending ? "Creating..." : "Create Leaf"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Leafs Grid */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
          
          <div className="max-w-[1200px] mx-auto relative z-10">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight font-['Geist',sans-serif]">Recent Leafs</h1>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {/* Create New Card */}
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsDialogOpen(true)}
                className="h-[220px] bg-card/50 backdrop-blur-sm border-2 border-border/50 border-dashed rounded-2xl flex flex-col items-center justify-center hover:bg-accent/50 hover:border-primary/50 transition-all duration-300 group text-left shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-background shadow-sm border border-border/50 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                  <Plus size={24} />
                </div>
                <span className="font-semibold text-sm tracking-wide">New Leaf</span>
              </motion.button>

              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[220px] bg-card/50 border border-border/50 rounded-2xl animate-pulse"></div>
                  ))}
                </>
              ) : (
                <>
                  {leafs?.map((leaf) => (
                    <motion.div
                      key={leaf.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link href={`/leaf/${leaf.id}`} className="block h-full">
                        <div className="h-[220px] bg-card border border-border/60 rounded-2xl flex flex-col hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                          {/* Top image section */}
                          <div className="flex-1 p-6 border-b border-border/40 relative overflow-hidden group/image flex flex-col justify-end">
                            <div 
                              className="absolute inset-0 bg-cover bg-center z-0 opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105"
                              style={{ backgroundImage: `url('https://cataas.com/cat?width=400&height=300&id=${leaf.id}')` }}
                            />
                            {/* Greenish tint overlay */}
                            <div className="absolute inset-0 bg-primary/20 mix-blend-overlay z-0" />
                            {/* Text readability gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent z-0" />
                            
                            <div className="absolute top-4 right-4 z-10">
                              <button className="opacity-0 group-hover:opacity-100 p-1.5 bg-background/50 hover:bg-background/90 backdrop-blur-md rounded-md text-foreground transition-all duration-200">
                                <MoreVertical size={18} />
                              </button>
                            </div>
                            
                            <div className="relative z-10 mt-12">
                              <h3 className="font-bold text-[22px] tracking-tight truncate pr-8 text-foreground drop-shadow-md">{leaf.name}</h3>
                              {leaf.description && (
                                <p className="text-sm text-foreground/90 mt-1 line-clamp-2 leading-relaxed drop-shadow-md">{leaf.description}</p>
                              )}
                            </div>
                          </div>
                          {/* Footer */}
                          <div className="h-[48px] px-6 bg-background/50 flex items-center justify-between text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                            <span>{new Date(leaf.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
