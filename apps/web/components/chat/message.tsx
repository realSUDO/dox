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
    <div className="flex w-full px-4 py-4 text-sm">
      <div className={cn(
        "mx-auto flex w-full max-w-3xl items-end gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {!isUser && (
          <div className="flex shrink-0 items-center justify-center pb-2">
            <img src="/dox.svg" alt="Dox AI" className="h-7 w-7" />
          </div>
        )}

        <div 
          className={cn(
            "flex flex-col max-w-[85%] rounded-3xl px-5 py-4",
            isUser 
              ? "bg-[#144637] text-white rounded-br-sm" 
              : "bg-white border border-[#EBEBEB] shadow-sm rounded-bl-sm"
          )}
        >
          <div className={cn(
            "prose prose-sm max-w-none break-words leading-relaxed",
            isUser ? "text-white prose-invert" : "text-[#1b1b1d]"
          )}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
