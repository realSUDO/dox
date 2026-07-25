"use client";

import React from "react";
import { CitationChip } from "./citation-chip";
import { cn } from "~/lib/utils";
import { User, Bot } from "lucide-react";
import { RouterOutputs } from "@repo/trpc/client";

// Get citation type from the query output
type CitationPayload = RouterOutputs["chat"]["query"]["citations"][number];

interface MessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  citations?: CitationPayload[];
}

export function ChatMessage({ role, content, citations = [] }: MessageProps) {
  if (role === "system") return null;

  const isUser = role === "user";

  // Parse [Source N] and replace with CitationChip
  const renderContent = () => {
    if (isUser || !citations.length) return content;

    const parts = content.split(/(\[Source\s+\d+\])/g);

    return parts.map((part, i) => {
      const match = part.match(/\[Source\s+(\d+)\]/);
      if (match && match[1]) {
        const idx = parseInt(match[1], 10);
        const citation = citations.find((c) => c.index === idx);
        
        if (citation) {
          return (
            <CitationChip
              key={i}
              index={idx}
              displayLabel={citation.displayLabel}
              sourceId={citation.sourceId}
              chunkId={citation.chunkId}
            />
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className={cn(
        "flex w-full px-4 py-6 text-sm",
        isUser ? "bg-background" : "bg-muted/50"
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl items-start gap-4">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border shadow-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
          )}
        >
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </div>
        
        <div className="flex-1 space-y-2 overflow-hidden px-1">
          <div className="font-semibold">{isUser ? "You" : "Assistant"}</div>
          <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
