"use client";

import React, { useState, useRef, useEffect, use } from "react";
import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { ChatMessage } from "~/components/chat/message";
import { Loader2, FileUp, Link as LinkIcon, Mic, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { RouterOutputs } from "@repo/trpc/client";

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
      toast.error(error.message || "Failed to process query");
    },
  });

  const utils = trpc.useUtils();

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

  return (
    <div className="flex flex-col h-full relative w-full">
      <div className="flex-1 overflow-y-auto pb-40 w-full">
        {isSessionLoading ? (
          <div className="h-full flex flex-col items-center justify-center w-full text-[#404945]">
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
            placeholder="Reply in conversation..."
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
