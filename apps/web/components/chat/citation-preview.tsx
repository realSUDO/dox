"use client";

import React from "react";
import { trpc } from "~/trpc/client";
import { Loader2, X, FileText, Link as LinkIcon, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface CitationPreviewProps {
  chunkId: string;
  sourceId: string;
  index: number;
  onClose: () => void;
}

export function CitationPreview({ chunkId, sourceId, index, onClose }: CitationPreviewProps) {
  const { data: chunk, isLoading, error } = trpc.sources.getChunk.useQuery(
    { chunkId },
    { refetchOnWindowFocus: false, retry: 1 }
  );

  return (
    <div className="flex flex-col h-full bg-background border-l border-border shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
        <div className="flex items-center gap-2 truncate">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/20 text-primary text-xs font-bold shrink-0">
            {index}
          </div>
          <span className="font-semibold text-sm truncate text-foreground">
            {chunk?.source?.fileName || chunk?.source?.sourceUrl || "Resource Preview"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Loading resource content...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-destructive gap-3 text-center">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-medium">Failed to load resource</p>
            <p className="text-xs opacity-80">{error.message}</p>
          </div>
        ) : chunk ? (
          <div className="prose prose-sm max-w-none text-foreground">
            <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground border-b border-border pb-2">
              {chunk.source?.type === "link" ? <LinkIcon size={14} /> : <FileText size={14} />}
              <span className="uppercase tracking-wider font-semibold">
                {chunk.source?.type}
              </span>
            </div>
            
            <p className="whitespace-pre-wrap leading-relaxed text-[13px] bg-accent/30 p-4 rounded-lg border border-border/50">
              {chunk.content}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
