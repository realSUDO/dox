"use client";

import { use, useState, useRef } from "react";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { UploadCloud, FileText, Link as LinkIcon, Trash2, Eye, Plus, Loader2, MoreVertical, FileArchive, FileImage, Youtube } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";

export default function KnowledgeBasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leafId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  
  // States
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [unifiedInput, setUnifiedInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview States
  const [previewSource, setPreviewSource] = useState<any>(null);

  // Queries
  const { data: sources, isLoading: isSourcesLoading } = trpc.sources.listSources.useQuery({ leafId });

  // Mutations
  const addTextMutation = trpc.sources.addText.useMutation({
    onSuccess: () => {
      toast.success("Text added successfully!");
      setUnifiedInput("");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to add text"),
  });

  const addLinkMutation = trpc.sources.addLink.useMutation({
    onSuccess: () => {
      toast.success("Link added successfully!");
      setUnifiedInput("");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to add link"),
  });

  const deleteMutation = trpc.sources.deleteSource.useMutation({
    onSuccess: () => {
      toast.success("Source deleted");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const getUploadUrlMutation = trpc.sources.requestUploadUrl.useMutation();
  const confirmUploadMutation = trpc.sources.confirmUpload.useMutation();

  // Handlers
  const handleUnifiedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unifiedInput.trim()) return;

    // Basic URL validation
    let isValidUrl = false;
    try {
      const url = new URL(unifiedInput);
      isValidUrl = url.protocol === "http:" || url.protocol === "https:";
    } catch {
      isValidUrl = false;
    }

    if (isValidUrl) {
      addLinkMutation.mutate({ leafId, url: unifiedInput.trim() });
    } else {
      addTextMutation.mutate({ leafId, content: unifiedInput, title: "Pasted Text" });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      handleUploadFile(selectedFile);
    }
  };

  const handleUploadFile = async (selectedFile: File) => {
    setIsUploading(true);
    try {
      const { sourceId, uploadUrl } = await getUploadUrlMutation.mutateAsync({
        leafId,
        fileName: selectedFile.name,
        mimeType: (selectedFile.type || "application/octet-stream") as any,
        fileSizeBytes: selectedFile.size,
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        }
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      await confirmUploadMutation.mutateAsync({ sourceId });
      
      toast.success("File uploaded successfully!");
      utils.sources.listSources.invalidate();
      setFile(null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getSourceIcon = (source: any) => {
    if (source.type === "link") {
      if (source.sourceUrl?.includes("youtube.com") || source.sourceUrl?.includes("youtu.be")) {
        return <Youtube className="text-red-500" size={20} />;
      }
      return <LinkIcon className="text-blue-500" size={20} />;
    }
    if (source.type === "text") return <FileText className="text-orange-500" size={20} />;
    if (source.mimeType?.includes("image")) return <FileImage className="text-purple-500" size={20} />;
    if (source.fileName?.endsWith(".zip")) return <FileArchive className="text-yellow-600" size={20} />;
    return <FileText className="text-[#144637]" size={20} />;
  };

  const isPending = addLinkMutation.isPending || addTextMutation.isPending;

  return (
    <div className="w-full h-full flex flex-col p-8 lg:px-16 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-['Geist',sans-serif] font-bold text-[#1b1b1d]">Knowledge Base</h1>
            <p className="text-[#404945] mt-1">Manage documents, links, and notes for this leaf.</p>
          </div>
          <Button 
            onClick={() => setShowUploadArea(!showUploadArea)}
            className="bg-[#144637] hover:bg-[#0F3529] text-white flex items-center gap-2"
          >
            {showUploadArea ? "Close Upload" : <><Plus size={16} /> Add Data</>}
          </Button>
        </div>

        {/* Toggleable Upload Area */}
        {showUploadArea && (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="space-y-6">
              
              {/* Drag and Drop */}
              <div 
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  isUploading ? "border-[#144637]/30 bg-[#f0edef]/50" : "border-[#c0c9c3] hover:bg-[#f0edef]/50 hover:border-[#144637]/50"
                }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 text-[#144637] animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-[#1b1b1d]">Uploading {file?.name}...</h3>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="mx-auto h-12 w-12 text-[#144637] opacity-60 mb-4" />
                    <h3 className="text-lg font-medium text-[#1b1b1d] mb-1">Click to upload files</h3>
                    <p className="text-sm text-[#404945]">PDF, Text, Subtitles, Images, ZIP (Max 50MB)</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </div>

              {/* Unified Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#1b1b1d]">Quick Add</label>
                <form onSubmit={handleUnifiedSubmit} className="relative">
                  <Textarea
                    value={unifiedInput}
                    onChange={(e) => setUnifiedInput(e.target.value)}
                    placeholder="Paste a URL or raw text here..."
                    className="min-h-[100px] border-2 border-dashed border-[#c0c9c3] rounded-xl focus:border-[#144637] focus:ring-0 text-sm resize-none pb-12"
                    disabled={isPending}
                  />
                  <div className="absolute bottom-3 right-3">
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={!unifiedInput.trim() || isPending}
                      className="bg-[#144637] hover:bg-[#0F3529] text-white"
                    >
                      {isPending ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        <div className="w-full h-px bg-[#c0c9c3]/40 my-8"></div>

        {/* Resource List */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Added Resources</h2>
          
          {isSourcesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#144637] opacity-50" />
            </div>
          ) : !sources || sources.length === 0 ? (
            <div className="text-center py-12 border border-[#EBEBEB] border-dashed rounded-xl bg-[#FBFBFA]">
              <p className="text-[#404945]">No resources added yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-[#EBEBEB]">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-4 hover:bg-[#FBFBFA] transition-colors">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-[#f0edef] flex items-center justify-center shrink-0">
                        {getSourceIcon(source)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm text-[#1b1b1d] truncate">
                          {source.fileName || source.sourceUrl || source.metadata?.title || "Untitled Source"}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#404945]">
                          <span className="capitalize">{source.type}</span>
                          {source.fileSizeBytes && (
                            <span>• {(source.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                          )}
                          <span>• {new Date(source.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1">
                            • <span className={`w-1.5 h-1.5 rounded-full ${source.status === 'indexed' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                            {source.status === 'indexed' ? 'Indexed' : 'Processing'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pl-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[#404945] hover:bg-[#e4e2e4] h-8 px-2"
                        onClick={() => setPreviewSource(source)}
                      >
                        <Eye size={16} className="mr-1" />
                        Preview
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#e4e2e4]">
                            <MoreVertical size={16} className="text-[#404945]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this resource?")) {
                                deleteMutation.mutate({ sourceId: source.id });
                              }
                            }}
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Sheet */}
      <Sheet open={!!previewSource} onOpenChange={(open) => !open && setPreviewSource(null)}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl bg-white border-l border-[#c0c9c3] shadow-2xl p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-[#EBEBEB]">
            <SheetTitle className="text-xl flex items-center gap-3">
              {previewSource && getSourceIcon(previewSource)}
              <span className="truncate">
                {previewSource?.fileName || previewSource?.sourceUrl || previewSource?.metadata?.title || "Resource Preview"}
              </span>
            </SheetTitle>
            <SheetDescription>
              {previewSource?.type === 'link' ? "Web Source" : "Document Source"} • Added {previewSource ? new Date(previewSource.createdAt).toLocaleDateString() : ''}
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 text-sm text-[#1b1b1d]">
              {previewSource?.type === 'link' && (
                <div className="p-4 bg-[#fcf8fb] rounded-lg border border-[#EBEBEB]">
                  <p className="font-medium text-[#404945] mb-2">Original URL</p>
                  <a href={previewSource.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {previewSource.sourceUrl}
                  </a>
                </div>
              )}
              
              <div className="p-4 bg-gray-50 rounded-lg border border-[#EBEBEB] whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                {previewSource?.textContent || "No text content available for preview yet. It may still be processing."}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
