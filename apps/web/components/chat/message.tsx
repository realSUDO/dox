"use client";

import React from "react";
import { CitationChip } from "./citation-chip";
import { cn } from "~/lib/utils";
import { RouterOutputs } from "@repo/trpc/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type CitationPayload = RouterOutputs["chat"]["query"]["citations"][number];

interface MessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  citations?: CitationPayload[];
  onCitationClick?: (citation: { index: number; displayLabel?: string | null; sourceId: string; chunkId: string }) => void;
}

export function ChatMessage({ role, content, citations = [], onCitationClick }: MessageProps) {
  if (role === "system") return null;

  const isUser = role === "user";

  const preProcessedContent = React.useMemo(() => {
    if (isUser || !citations.length) return content;
    return content.replace(/\[Source\s+(\d+)\]/g, (match, idx) => `[${match}](#citation-${idx})`);
  }, [content, citations, isUser]);

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
              ? "bg-primary text-primary-foreground rounded-br-sm" 
              : "bg-card border border-border shadow-sm rounded-bl-sm"
          )}
        >
          <div className={cn(
            "prose prose-sm max-w-none break-words leading-relaxed",
            isUser ? "text-primary-foreground prose-invert" : "text-foreground"
          )}>
            {isUser ? (
              <p className="whitespace-pre-wrap m-0">{content}</p>
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a({ node, href, children, ...props }) {
                    if (href?.startsWith("#citation-")) {
                      const idxStr = href.replace("#citation-", "");
                      const idx = parseInt(idxStr, 10);
                      const citation = citations.find((c) => c.index === idx);
                      
                      if (citation) {
                        return (
                          <CitationChip
                            index={idx}
                            displayLabel={citation.displayLabel}
                            sourceId={citation.sourceId}
                            chunkId={citation.chunkId}
                            onClick={onCitationClick}
                          />
                        );
                      }
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" {...props}>{children}</a>;
                  }
                }}
              >
                {preProcessedContent}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
