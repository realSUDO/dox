"use client";

import React, { useState } from "react";
import { CitationChip } from "./citation-chip";
import { cn } from "~/lib/utils";
import { RouterOutputs } from "@repo/trpc/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brain, ChevronDown, ChevronRight, Activity, Search, FileSearch, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CitationPayload = RouterOutputs["chat"]["query"]["citations"][number];

interface MessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  citations?: CitationPayload[];
  thoughtProcess?: any[];
  onCitationClick?: (citation: { index: number; displayLabel?: string | null; sourceId: string; chunkId: string }) => void;
}

function ThoughtProcessWidget({ steps }: { steps: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!steps || steps.length === 0) return null;

  const totalDuration = steps.reduce((acc, step) => acc + (step.durationMs || 0), 0);
  const seconds = totalDuration > 0 ? (totalDuration / 1000).toFixed(1) : null;

  return (
    <div className="mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-accent/50 hover:bg-accent px-3 py-1.5 rounded-full border border-border/50"
      >
        <Brain size={14} className={isOpen ? "text-primary" : ""} />
        <span>{isOpen ? "Hide thought process" : `Thought process${seconds ? ` (${seconds}s)` : ""}`}</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pl-2 border-l-2 border-primary/20 space-y-3 py-1">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    {step.step}
                    {step.durationMs && <span className="text-muted-foreground font-normal">({(step.durationMs / 1000).toFixed(1)}s)</span>}
                  </div>
                  {step.details && (
                    <div className="ml-3.5 text-[11px] text-muted-foreground bg-background/50 rounded-md px-3 py-2 border border-border/30">
                      <pre className="font-mono whitespace-pre-wrap m-0">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatMessage({ role, content, citations = [], thoughtProcess, onCitationClick }: MessageProps) {
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
          {!isUser && thoughtProcess && thoughtProcess.length > 0 && (
            <ThoughtProcessWidget steps={thoughtProcess} />
          )}

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
