"use client";

import React, { useState } from "react";
import { trpc } from "~/trpc/client";
import { Loader2, X, FileText, Link as LinkIcon, AlertCircle, ExternalLink, FileArchive, FileImage, Image as ImageIcon, DownloadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import bytes from "bytes";
import { Badge } from "~/components/ui/badge";

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

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  
  const getDownloadUrlMutation = trpc.sources.getDownloadUrl.useMutation({
    onSuccess: (data) => {
      setDownloadUrl(data.url);
      window.open(data.url, "_blank");
    }
  });

  const handleOpenSource = () => {
    if (!chunk?.source) return;
    
    // For PDFs, we want to try inline preview first
    const isPdf = chunk.source.type?.includes("pdf");
    
    if (chunk.source.sourceUrl) {
      if (isPdf) {
        setShowInlinePreview(true);
      } else {
        window.open(chunk.source.sourceUrl, "_blank");
      }
    } else if (chunk.source.storageKey) {
      if (downloadUrl) {
        if (isPdf) {
          setShowInlinePreview(true);
        } else {
          window.open(downloadUrl, "_blank");
        }
      } else {
        getDownloadUrlMutation.mutate({ sourceId: chunk.source.id }, {
          onSuccess: (data) => {
            if (isPdf) {
              setShowInlinePreview(true);
            }
          }
        });
      }
    }
  };

  const getSourceIcon = (type: string | undefined) => {
    if (!type) return <FileText size={16} />;
    if (type.includes("pdf")) return <FileText size={16} className="text-red-500" />;
    if (type.includes("image")) return <ImageIcon size={16} className="text-blue-500" />;
    if (type.includes("zip")) return <FileArchive size={16} className="text-yellow-600" />;
    if (type === "link") return <LinkIcon size={16} className="text-emerald-500" />;
    return <FileText size={16} className="text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border/50 flex items-center justify-between px-4 shrink-0 bg-card/50">
        <div className="flex items-center gap-3 truncate">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0 border border-primary/20">
            {index}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate text-foreground flex items-center gap-2">
              {getSourceIcon(chunk?.source?.type)}
              <span className="truncate">{chunk?.source?.fileName || chunk?.source?.sourceUrl || "Resource"}</span>
            </span>
            {chunk?.source?.fileSizeBytes && (
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {bytes(chunk.source.fileSizeBytes)} • {chunk.source.type}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-all shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            <p className="text-sm font-medium">Loading citation...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-destructive gap-3 text-center bg-destructive/5 rounded-2xl p-6 border border-destructive/20">
            <AlertCircle className="w-10 h-10" />
            <p className="text-base font-semibold">Failed to load resource</p>
            <p className="text-xs opacity-80">{error.message}</p>
          </div>
        ) : chunk ? (
          <div className="space-y-6">
            
            {/* Metadata Tags */}
            <div className="flex flex-wrap gap-2">
              {chunk.pageNumber && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  Page {chunk.pageNumber}
                </Badge>
              )}
              {chunk.timestampLabel && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  {chunk.timestampLabel}
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground">
                Relevance: {Math.round((chunk as any).score ? (chunk as any).score * 100 : 0)}%
              </Badge>
            </div>

            {/* Excerpt */}
            <div className="prose prose-sm max-w-none text-foreground">
              <div className="relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 rounded-full" />
                <p className="whitespace-pre-wrap leading-relaxed text-[14px] bg-accent/20 p-5 pl-6 rounded-2xl border border-border/50 text-foreground/90 font-['Inter',sans-serif]">
                  {chunk.content}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border/50">
              <button
                onClick={handleOpenSource}
                disabled={getDownloadUrlMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {getDownloadUrlMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : chunk.source?.type?.includes("pdf") ? (
                  <FileText size={16} />
                ) : chunk.source?.sourceUrl ? (
                  <ExternalLink size={16} />
                ) : (
                  <DownloadCloud size={16} />
                )}
                {chunk.source?.type?.includes("pdf") ? "View Original File (Inline)" : chunk.source?.sourceUrl ? "Open Original Link" : "Download Original File"}
              </button>
            </div>

            {/* Inline Preview */}
            <AnimatePresence>
              {showInlinePreview && (downloadUrl || chunk.source?.sourceUrl) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "400px" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full border border-border/50 rounded-xl overflow-hidden mt-6 bg-accent/20"
                >
                  <iframe 
                    src={`${downloadUrl || chunk.source?.sourceUrl}${chunk.pageNumber ? `#page=${chunk.pageNumber}` : ""}`}
                    className="w-full h-full border-0"
                    title="Document Preview"
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        ) : null}
      </div>
    </div>
  );
}
