"use client";

import React, { useState, useRef, useEffect, use } from "react";
import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { ChatMessage } from "~/components/chat/message";
import { Loader2, FileUp, Link as LinkIcon, ArrowUp, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { RouterOutputs } from "@repo/trpc/client";
import { UploadCloud } from "lucide-react";
import { FilePill } from "~/components/chat/file-pill";
import { CitationPreview } from "~/components/chat/citation-preview";

type ChatHistoryMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: RouterOutputs["chat"]["query"]["citations"];
};

export default function ChatSessionPage({ params }: { params: Promise<{ id: string, chatId: string }> }) {
  const { id: leafId, chatId: chatSessionId } = use(params);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states for drag & drop + inline link
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; status: 'uploading' | 'processing' | 'pending_approval' | 'success' | 'error'; sourceId?: string; errorMessage?: string }[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [inlineLinkUrl, setInlineLinkUrl] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<{
    index: number;
    displayLabel?: string | null;
    sourceId: string;
    chunkId: string;
  } | null>(null);

  const { data: session, isLoading: isSessionLoading } = trpc.chat.getSession.useQuery(
    { chatSessionId },
    { refetchOnWindowFocus: false }
  );

  const queryMutation = trpc.chat.query.useMutation({
    onSuccess: (data: any) => {
      // Refresh the session to get the latest messages
      utils.chat.getSession.invalidate({ chatSessionId });
    },
    onError: (error: any) => {
      if (error.message?.includes("OUT_OF_CREDITS")) {
        toast.error("You don't have enough credits to ask this question! Please upgrade your plan.", {
          duration: 5000,
        });
      } else {
        toast.error(error.message || "Failed to process query");
      }
    },
  });

  const utils = trpc.useUtils();
  const getUploadUrlMutation = trpc.sources.requestUploadUrl.useMutation();
  const confirmUploadMutation = trpc.sources.confirmUpload.useMutation();
  const approveMutation = trpc.sources.approveSource.useMutation({
    onSuccess: () => {
      toast.success("Source approved! Embedding started.");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to approve"),
  });
  const addLinkMutation = trpc.sources.addLink.useMutation({
    onSuccess: () => {
      toast.success("Link added to knowledge base!");
      utils.sources.listSources.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add link");
    }
  });

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      const fileId = crypto.randomUUID();
      setUploadingFiles((prev) => [...prev, { id: fileId, name: file.name, status: "uploading" }]);
      
      try {
        let actualMimeType = file.type || "application/octet-stream";
        if (file.name.toLowerCase().endsWith(".zip")) {
          actualMimeType = "application/zip";
        }

        const { sourceId, uploadUrl } = await getUploadUrlMutation.mutateAsync({
          leafId,
          fileName: file.name,
          mimeType: actualMimeType as any,
          fileSizeBytes: file.size,
        });

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          }
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file");

        await confirmUploadMutation.mutateAsync({ sourceId });
        
        toast.success(`${file.name} uploaded! Processing...`);
        utils.sources.listSources.invalidate();
        setUploadingFiles((prev) => prev.map(f => f.id === fileId ? { ...f, status: "processing", sourceId } : f));
        
      } catch (err: any) {
        toast.error(`Error uploading ${file.name}: ${err.message}`);
        setUploadingFiles((prev) => prev.map(f => f.id === fileId ? { ...f, status: "error" } : f));
        
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter(f => f.id !== fileId));
        }, 4000);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    handleFiles(Array.from(e.target.files));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleAddInlineLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineLinkUrl.trim()) return;
    addLinkMutation.mutate({ leafId, url: inlineLinkUrl }, {
      onSuccess: () => {
        setInlineLinkUrl("");
        setShowLinkInput(false);
      }
    });
  };

  const handleSend = () => {
    if (!input.trim() || queryMutation.isPending) return;

    const userMsg = input.trim();
    setInput("");

    // Optimistically update the cache to show user message instantly
    utils.chat.getSession.setData({ chatSessionId }, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        messages: [
          ...oldData.messages,
          {
            id: crypto.randomUUID(),
            chatSessionId,
            role: "user",
            content: userMsg,
            createdAt: new Date(),
          },
        ],
      };
    });

    queryMutation.mutate({
      leafId,
      query: userMsg,
      chatSessionId,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, queryMutation.isPending]);

  useEffect(() => {
    const filesToPoll = uploadingFiles.filter(f => f.status === 'processing' || f.status === 'embedding');
    if (filesToPoll.length === 0) return;

    const interval = setInterval(async () => {
      for (const f of filesToPoll) {
        if (!f.sourceId) continue;
        try {
          const source = await utils.client.sources.getSource.query({ sourceId: f.sourceId });
          if (source.status === 'pending_approval' && f.status === 'processing') {
            setUploadingFiles(prev => prev.map(uf => uf.id === f.id ? { ...uf, status: 'pending_approval' } : uf));
          } else if (source.status === 'indexed') {
            setUploadingFiles(prev => prev.map(uf => uf.id === f.id ? { ...uf, status: 'success' } : uf));
            setTimeout(() => {
              setUploadingFiles(prev => prev.filter(uf => uf.id !== f.id));
            }, 3000);
          } else if (source.status === 'failed') {
            setUploadingFiles(prev => prev.map(uf => uf.id === f.id ? { ...uf, status: 'error', errorMessage: source.lastError || "Failed to process" } : uf));
            setTimeout(() => {
              setUploadingFiles(prev => prev.filter(uf => uf.id !== f.id));
            }, 8000); // 8 seconds to let user read the error
          }
        } catch (e) {
          console.error(e);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [uploadingFiles, utils]);

  return (
    <div 
      className="flex flex-row h-full relative w-full overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full min-w-0 transition-all duration-300">
        <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-[#144637] rounded-xl m-4"
          >
            <div className="flex flex-col items-center justify-center text-primary">
              <UploadCloud size={64} className="mb-4" />
              <h2 className="text-2xl font-bold font-['Geist',sans-serif]">Drop files to add to Knowledge Base</h2>
              <p className="text-lg opacity-80 mt-2">Supports PDF, Text, and Images</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex-1 overflow-y-auto pb-40 w-full">
        {isSessionLoading ? (
          <div className="h-full flex flex-col items-center justify-center w-full text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading chat history...</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-8 w-full">
            {session?.messages.map((msg: any) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                citations={msg.citations || []}
                onCitationClick={setSelectedCitation}
              />
            ))}
            {queryMutation.isPending && (
              <div className="flex w-full px-4 py-6 text-sm">
                <div className="flex w-full items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                    <img src="/dox.svg" alt="Dox AI" className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2 px-1">
                    <div className="font-semibold text-foreground">Dox Assistant</div>
                    <div className="text-muted-foreground">Synthesizing information...</div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Right Sidebar for Citation Preview */}
      <AnimatePresence>
        {selectedCitation && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="h-full shrink-0 z-40 hidden md:block border-l border-border bg-background"
          >
            <div className="w-[380px] h-full">
              <CitationPreview
                chunkId={selectedCitation.chunkId}
                sourceId={selectedCitation.sourceId}
                index={selectedCitation.index}
                onClose={() => setSelectedCitation(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Composer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center w-full max-w-3xl px-4 md:px-0 z-50">
        
        {/* Uploading Files Chips */}
        <div className="w-full flex flex-wrap gap-2 mb-2">
          <AnimatePresence>
            {uploadingFiles.map((file) => (
              <FilePill
                key={file.id}
                file={file as any}
                onRemove={() => setUploadingFiles(prev => prev.filter(f => f.id !== file.id))}
                isApproving={approveMutation.isPending}
                onApprove={() => {
                  if (!file.sourceId) return;
                  approveMutation.mutate({ sourceId: file.sourceId }, {
                    onSuccess: () => {
                      setUploadingFiles(prev => prev.map(uf => uf.id === file.id ? { ...uf, status: 'embedding' } : uf));
                    }
                  });
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Inline Link Form */}
        <AnimatePresence>
          {showLinkInput && (
            <motion.form
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              onSubmit={handleAddInlineLink}
              className="w-full bg-background/95 backdrop-blur-md border-2 border-dashed border-border rounded-[24px] flex items-center p-2 overflow-hidden shadow-lg"
            >
              <LinkIcon className="text-muted-foreground opacity-50 ml-2 shrink-0" size={18} />
              <input
                type="url"
                autoFocus
                value={inlineLinkUrl}
                onChange={(e) => setInlineLinkUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-foreground px-3 py-2 outline-none"
                disabled={addLinkMutation.isPending}
              />
              <button 
                type="submit"
                disabled={!inlineLinkUrl.trim() || addLinkMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shrink-0 flex items-center gap-2"
              >
                {addLinkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowLinkInput(false)}
                className="p-2 text-muted-foreground hover:bg-accent rounded-full ml-1 shrink-0 transition-all"
              >
                <X size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <motion.div 
          layout
          className="w-full bg-background/80 backdrop-blur-md border border-border rounded-[32px] shadow-lg p-2 flex items-end gap-2"
        >
          <div className="flex items-center gap-1 pb-1 pl-1 flex-none">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              multiple
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:bg-accent rounded-full transition-all flex-none"
              title="Add to Knowledge Base"
            >
              <FileUp size={20} />
            </button>
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              type="button"
              className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:bg-accent rounded-full transition-all flex-none"
              title="Add Link"
            >
              <LinkIcon size={20} />
            </button>
          </div>
          
          <motion.textarea
            layout
            className="flex-1 bg-transparent border-none focus:ring-0 font-['Inter',sans-serif] text-base text-foreground placeholder:text-muted-foreground/50 py-3 px-2 outline-none resize-none min-h-[44px] max-h-[200px]"
            placeholder="Reply in conversation..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          
          <div className="flex items-center gap-2 pr-1 pb-1 flex-none">
            <button
              onClick={handleSend}
              disabled={!input.trim() || queryMutation.isPending || uploadingFiles.some(f => f.status === 'uploading' || f.status === 'processing' || f.status === 'embedding')}
              className="h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:opacity-90 scale-100 active:scale-95 transition-transform disabled:opacity-50 flex-none"
              title={uploadingFiles.some(f => f.status === 'uploading' || f.status === 'processing' || f.status === 'embedding') ? "Waiting for files to finish processing..." : "Send"}
            >
              {queryMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ArrowUp size={20} />
              )}
            </button>
          </div>
        </motion.div>
      </div>
      {/* End Main Chat Area */}
      </div>
    </div>
  );
}
