"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { ChatMessage } from "~/components/chat/message";
import { Loader2, FileUp, Link as LinkIcon, Mic, Send, BookOpen } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { RouterOutputs } from "@repo/trpc/client";
import { UploadCloud } from "lucide-react";

type ChatHistoryMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: RouterOutputs["chat"]["query"]["citations"];
};

export default function LeafPage() {
  const params = useParams();
  const leafId = params.id as string;

  const [input, setInput] = useState("");
  const router = useRouter();
  const [messages, setMessages] = useState<ChatHistoryMsg[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Empty state handling
  const utils = trpc.useUtils();
  const { data: sources, isLoading: isSourcesLoading } = trpc.sources.listSources.useQuery({ leafId });
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLinkMutation = trpc.sources.addLink.useMutation({
    onSuccess: () => {
      toast.success("Link added to knowledge base!");
      utils.sources.listSources.invalidate();
      setUrlInput("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add link");
    }
  });

  const getUploadUrlMutation = trpc.sources.requestUploadUrl.useMutation();
  const confirmUploadMutation = trpc.sources.confirmUpload.useMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const { sourceId, uploadUrl } = await getUploadUrlMutation.mutateAsync({
        leafId,
        fileName: file.name,
        mimeType: (file.type || "application/octet-stream") as any,
        fileSizeBytes: file.size,
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        }
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      await confirmUploadMutation.mutateAsync({ sourceId });
      
      toast.success("File uploaded to knowledge base!");
      utils.sources.listSources.invalidate();
    } catch (err: any) {
      toast.error(err.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    addLinkMutation.mutate({ leafId, url: urlInput });
  };

  const queryMutation = trpc.chat.query.useMutation({
    onSuccess: (data: any) => {
      // It's a new chat, so redirect to the persistent chat route
      router.push(`/leaf/${leafId}/chat/${data.chatSessionId}`);
      utils.chat.listSessions.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process query");
      // Revert the optimistic message on error
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const handleSend = () => {
    if (!input.trim() || queryMutation.isPending) return;

    const userMsg = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userMsg,
      },
    ]);

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
  }, [messages, queryMutation.isPending]);

  return (
    <div className="flex flex-col h-full relative w-full">
      <div className="flex-1 overflow-y-auto pb-40 w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center w-full">
            {isSourcesLoading ? (
               <div className="flex flex-col items-center justify-center text-[#404945]">
                 <Loader2 className="w-8 h-8 animate-spin mb-4" />
                 <p>Loading workspace...</p>
               </div>
            ) : (!sources || sources.length === 0) ? (
              <div className="max-w-2xl w-full px-10 text-center space-y-8 -mt-32">
                <div className="space-y-2">
                  <h2 className="font-['Geist',sans-serif] text-3xl font-semibold text-[#1b1b1d] tracking-tight">
                    Build your Knowledge Base
                  </h2>
                  <p className="font-['Inter',sans-serif] text-[#404945] max-w-lg mx-auto">
                    Upload documents or add web links to start synthesizing information in this leaf.
                  </p>
                </div>

                <div 
                  className="border-2 border-dashed border-[#c0c9c3] rounded-2xl p-12 text-center hover:bg-[#e4e2e4]/50 transition-colors cursor-pointer bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="mx-auto h-12 w-12 text-[#144637] mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-[#1b1b1d] mb-1">Click to upload files</h3>
                  <p className="text-sm text-[#404945]">
                    Supports PDF, Text, and Images (Max 50MB)
                  </p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#144637]">
                      <Loader2 size={16} className="animate-spin" /> Uploading...
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#c0c9c3]"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#fcf8fb] px-2 text-[#404945]">Or add a web link</span>
                  </div>
                </div>

                <form onSubmit={handleAddUrl} className="relative flex items-center">
                  <LinkIcon className="absolute left-4 text-[#404945] opacity-50" size={18} />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full bg-white border-2 border-dashed border-[#c0c9c3] rounded-xl py-4 pl-12 pr-24 text-sm focus:outline-none focus:border-[#144637] transition-colors"
                    disabled={addLinkMutation.isPending}
                  />
                  <button 
                    type="submit"
                    disabled={!urlInput.trim() || addLinkMutation.isPending}
                    className="absolute right-2 px-4 py-2 bg-[#144637] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {addLinkMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Add Link"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="max-w-3xl w-full px-10 text-center space-y-6 -mt-32">
                <div className="inline-flex items-center justify-center p-10 rounded-full bg-[#f0edef] mb-6">
                  <BookOpen size={64} className="text-[#144637] opacity-20" />
                </div>
                <h2 className="font-['Geist',sans-serif] text-5xl font-semibold text-[#1b1b1d] tracking-tight">
                  Ask anything
                </h2>
                <p className="font-['Inter',sans-serif] text-lg text-[#404945] max-w-xl mx-auto leading-relaxed">
                  Connect your documents, research notes, and creative thoughts. Dox helps you
                  synthesize complex information with ease.
                </p>

                <div className="flex flex-wrap justify-center gap-2 pt-10">
                  <button
                    onClick={() => setInput("Summarize my recent notes")}
                    className="px-4 py-2 bg-white border border-[#c0c9c3] rounded-full text-sm font-medium text-[#404945] hover:bg-[#f0edef] transition-colors"
                  >
                    Summarize my recent notes
                  </button>
                  <button
                    onClick={() => setInput("Find connections in my sources")}
                    className="px-4 py-2 bg-white border border-[#c0c9c3] rounded-full text-sm font-medium text-[#404945] hover:bg-[#f0edef] transition-colors"
                  >
                    Find connections in my sources
                  </button>
                  <button
                    onClick={() => setInput("Generate an outline")}
                    className="px-4 py-2 bg-white border border-[#c0c9c3] rounded-full text-sm font-medium text-[#404945] hover:bg-[#f0edef] transition-colors"
                  >
                    Generate an outline
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-8 w-full">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                citations={msg.citations}
              />
            ))}
            {queryMutation.isPending && (
              <div className="flex w-full px-4 py-6 text-sm">
                <div className="flex w-full items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#c0c9c3] bg-white text-[#144637]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="flex-1 space-y-2 px-1">
                    <div className="font-semibold text-[#144637]">Dox Assistant</div>
                    <div className="text-[#404945]">Synthesizing information...</div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Composer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center w-full max-w-2xl px-4 md:px-0 z-50">
        <div className="w-full bg-[#fcf8fb]/80 backdrop-blur-md border border-[#c0c9c3] rounded-xl shadow-lg p-2 flex items-center gap-2">
          <Link href={`/leaf/${leafId}/upload`}>
            <button
              className="p-3 text-[#404945] hover:bg-[#e4e2e4] rounded-lg transition-all"
              title="Upload"
            >
              <FileUp size={24} />
            </button>
          </Link>
          <button
            className="p-3 text-[#404945] hover:bg-[#e4e2e4] rounded-lg transition-all"
            title="Add Link"
          >
            <LinkIcon size={24} />
          </button>
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 font-['Inter',sans-serif] text-base text-[#1b1b1d] placeholder:text-[#404945]/50 py-3 px-2 outline-none"
            placeholder="Start a new conversation..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-2 mr-2">
            <button
              className="p-3 text-[#404945] hover:bg-[#e4e2e4] rounded-lg transition-all"
              title="Voice Input"
            >
              <Mic size={24} />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || queryMutation.isPending}
              className="p-3 bg-[#144637] text-white rounded-lg flex items-center justify-center hover:opacity-90 scale-100 active:scale-95 transition-transform disabled:opacity-50"
              title="Send"
            >
              {queryMutation.isPending ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Send size={24} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
