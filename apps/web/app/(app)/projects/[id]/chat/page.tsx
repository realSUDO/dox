"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { ChatMessage } from "~/components/chat/message";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { RouterOutputs } from "@repo/trpc/client";

type ChatHistoryMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: RouterOutputs["chat"]["query"]["citations"];
};

export default function ChatPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatHistoryMsg[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const queryMutation = trpc.chat.query.useMutation({
    onSuccess: (data: any) => {
      setChatSessionId(data.chatSessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: "assistant",
          content: data.answer,
          citations: data.citations,
        },
      ]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process query");
      // Remove the optimistic user message if we want, or just leave it.
    },
  });

  const handleSend = () => {
    if (!input.trim() || queryMutation.isPending) return;

    const userMsg = input.trim();
    setInput("");

    // Optimistic user message
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userMsg,
      },
    ]);

    queryMutation.mutate({
      projectId,
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
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-muted/20">
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Research Assistant</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <p className="max-w-sm">
              Ask me anything about the sources you've uploaded to this project. I'll provide answers with exact citations.
            </p>
          </div>
        ) : (
          <div className="pb-8">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                citations={msg.citations}
              />
            ))}
            {queryMutation.isPending && (
              <div className="flex w-full px-4 py-6 text-sm bg-muted/50">
                <div className="mx-auto flex w-full max-w-3xl items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border shadow-sm bg-card text-card-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="flex-1 space-y-2 px-1">
                    <div className="font-semibold">Assistant</div>
                    <div className="text-muted-foreground">Thinking...</div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="bg-background p-4 shadow-sm border-t">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            placeholder="Ask a question about your sources..."
            className="min-h-[60px] max-h-[200px] resize-none"
            value={input}
            onChange={(e: any) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Button
            size="icon"
            className="mb-1 h-10 w-10 shrink-0 rounded-full"
            disabled={!input.trim() || queryMutation.isPending}
            onClick={handleSend}
          >
            {queryMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Just importing Bot icon for the empty state
import { Bot } from "lucide-react";
