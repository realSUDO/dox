"use client";

import { useState } from "react";
import { trpc } from "~/trpc/client";
import Link from "next/link";
import { toast } from "sonner";
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
    <div className="flex h-screen bg-[#FBFBFA] text-[#1B1B1D] font-['Inter',sans-serif] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] border-r border-[#EBEBEB] bg-white flex flex-col h-full flex-shrink-0">
        <div className="p-4 mb-2 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#144637] rounded-md flex items-center justify-center text-white font-bold">
            D
          </div>
          <span className="font-semibold text-lg">Dox</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 bg-[#F3F3F3] text-[#144637] rounded-md font-medium text-sm transition-colors">
            <Home size={18} />
            Home
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-[#6B6B6B] hover:bg-[#F9F9F9] hover:text-[#1B1B1D] rounded-md font-medium text-sm transition-colors">
            <Trash2 size={18} />
            Trash
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-[#6B6B6B] hover:bg-[#F9F9F9] hover:text-[#1B1B1D] rounded-md font-medium text-sm transition-colors">
            <Settings size={18} />
            Settings
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-[#6B6B6B] hover:bg-[#F9F9F9] hover:text-[#1B1B1D] rounded-md font-medium text-sm transition-colors">
            <CreditCard size={18} />
            Billing
          </Link>
        </nav>

        <div className="p-4 border-t border-[#EBEBEB]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#144637] flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">My Workspace</p>
              <p className="text-xs text-[#6B6B6B] truncate">Free Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <header className="h-[60px] border-b border-[#EBEBEB] bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
            <Home size={16} />
            <span>/</span>
            <span className="font-medium text-[#1B1B1D]">Home</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={16} />
              <input 
                type="text" 
                placeholder="Search leafs..." 
                className="pl-9 pr-4 py-1.5 bg-[#F9F9F9] border border-[#EBEBEB] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#144637] transition-all w-[240px]"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-[#144637] hover:bg-[#0F3529] text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
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
                    <Button type="submit" disabled={createMutation.isPending} className="bg-[#144637] hover:bg-[#0F3529]">
                      {createMutation.isPending ? "Creating..." : "Create Leaf"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Leafs Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">Recent Leafs</h1>
              <div className="flex gap-2">
                <button className="p-1.5 text-[#6B6B6B] hover:bg-[#EBEBEB] rounded-md transition-colors bg-[#EBEBEB]">
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[200px] bg-white border border-[#EBEBEB] rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Create New Card */}
                <button 
                  onClick={() => setIsDialogOpen(true)}
                  className="h-[200px] bg-white border border-[#EBEBEB] border-dashed rounded-xl flex flex-col items-center justify-center hover:bg-[#F9F9F9] hover:border-[#144637]/50 transition-all group text-left"
                >
                  <div className="w-10 h-10 bg-[#F3F3F3] rounded-full flex items-center justify-center mb-3 group-hover:bg-[#144637] group-hover:text-white transition-colors">
                    <Plus size={20} />
                  </div>
                  <span className="font-medium text-sm">New Leaf</span>
                </button>

                {leafs?.map((leaf) => (
                  <Link href={`/leaf/${leaf.id}`} key={leaf.id}>
                    <div className="h-[200px] bg-white border border-[#EBEBEB] rounded-xl flex flex-col hover:shadow-md hover:border-[#D1D1D1] transition-all cursor-pointer group">
                      <div className="flex-1 p-5 border-b border-[#F3F3F3] bg-gradient-to-b from-[#FBFBFA] to-white rounded-t-xl relative overflow-hidden">
                        {/* Placeholder graphic for the leaf card */}
                        <div className="absolute top-4 right-4">
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#F3F3F3] rounded text-[#6B6B6B] transition-all">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        <div className="w-12 h-12 bg-white shadow-sm border border-[#EBEBEB] rounded-lg flex items-center justify-center mb-3">
                           <FileText className="text-[#144637]" size={24} />
                        </div>
                        <h3 className="font-semibold text-[15px] truncate pr-8">{leaf.name}</h3>
                        {leaf.description && (
                          <p className="text-xs text-[#6B6B6B] mt-1 line-clamp-2">{leaf.description}</p>
                        )}
                      </div>
                      <div className="h-[44px] px-5 flex items-center justify-between text-[#6B6B6B] text-[11px] font-medium">
                        <span>Edited {new Date(leaf.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
