"use client";

import React, { useState } from "react";
import { trpc } from "~/trpc/client";
import { Loader2, X, FileText, Link as LinkIcon, AlertCircle, ExternalLink, FileArchive, FileImage, Image as ImageIcon, DownloadCloud, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import bytes from "bytes";
import { Badge } from "~/components/ui/badge";

interface CitationPreviewProps {
  chunkId: string;
  sourceId: string;
  index: number;
  score?: number | null;
  onClose: () => void;
}

export function CitationPreview({ chunkId, sourceId, index, score, onClose }: CitationPreviewProps) {
  const { data: chunk, isLoading, error } = trpc.sources.getChunk.useQuery(
    { chunkId },
    { refetchOnWindowFocus: false, retry: 1 }
  );

  const { data: downloadData, isLoading: isDownloadLoading } = trpc.sources.getDownloadUrl.useQuery(
    { sourceId: chunk?.source?.id as string },
    { 
      enabled: !!chunk?.source?.id && !!chunk?.source?.storageKey,
      refetchOnWindowFocus: false,
    }
  );

  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [isTextCollapsed, setIsTextCollapsed] = useState(true);
  
  const handleOpenSource = async () => {
    if (!chunk?.source) return;
    
    // For PDFs, we want to try inline preview first
    const isPdf = chunk.source.mimeType?.includes("pdf") || chunk.source.fileName?.toLowerCase().endsWith(".pdf");
    
    if (chunk.source.sourceUrl) {
      if (isPdf) {
        setShowInlinePreview(true);
      } else {
        window.open(chunk.source.sourceUrl, "_blank");
      }
    } else if (chunk.source.storageKey) {
      if (downloadData?.url) {
        if (isPdf) {
          setShowInlinePreview(true);
        } else {
          window.open(downloadData.url, "_blank");
        }
      }
    }
  };

  const getSourceIcon = (type: string | undefined, mimeType: string | null | undefined, fileName: string | null | undefined) => {
    if (!type) return <FileText size={16} />;
    if (mimeType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf")) return <FileText size={16} className="text-red-500" />;
    if (mimeType?.includes("image") || fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon size={16} className="text-blue-500" />;
    if (mimeType?.includes("zip") || fileName?.toLowerCase().endsWith(".zip")) return <FileArchive size={16} className="text-yellow-600" />;
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
              {getSourceIcon(chunk?.source?.type, chunk?.source?.mimeType, chunk?.source?.fileName)}
              <span className="truncate">{chunk?.source?.fileName || chunk?.source?.sourceUrl || "Resource"}</span>
            </span>
            {chunk?.source?.fileSizeBytes && (
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {bytes(Number(chunk.source.fileSizeBytes))} • {chunk.source.mimeType?.split('/')[1] || chunk.source.type}
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
            </div>

            {/* Excerpt */}
            <div className="prose prose-sm max-w-none text-foreground flex flex-col gap-2">
              <button 
                onClick={() => setIsTextCollapsed(!isTextCollapsed)}
                className="flex items-center justify-between w-full text-left py-1 group outline-none"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">Retrieved Excerpt</span>
                <ChevronDown size={14} className={`text-muted-foreground group-hover:text-foreground transition-transform duration-200 ${isTextCollapsed ? "rotate-0" : "rotate-180"}`} />
              </button>
              
              <div className="relative pt-1 pb-1 cursor-pointer" onClick={() => setIsTextCollapsed(!isTextCollapsed)}>
                <div className="absolute top-1 left-0 w-1 bottom-1 bg-primary/30 rounded-full" />
                <p 
                  className={`whitespace-pre-wrap leading-relaxed text-[14px] bg-accent/20 p-5 pl-6 rounded-2xl border border-border/50 text-foreground/90 font-['Inter',sans-serif] transition-all duration-300 ${isTextCollapsed ? "line-clamp-2" : ""}`}
                  style={isTextCollapsed ? { WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)' } : {}}
                >
                  {chunk.content}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border/50">
              <button
                onClick={handleOpenSource}
                disabled={isDownloadLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isDownloadLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (chunk.source?.mimeType?.includes("pdf") || chunk.source?.fileName?.toLowerCase().endsWith(".pdf")) ? (
                  <FileText size={16} />
                ) : chunk.source?.sourceUrl ? (
                  <ExternalLink size={16} />
                ) : (
                  <DownloadCloud size={16} />
                )}
                {(chunk.source?.mimeType?.includes("pdf") || chunk.source?.fileName?.toLowerCase().endsWith(".pdf")) ? "View Original File (Inline)" : chunk.source?.sourceUrl ? "Open Original Link" : "Download Original File"}
              </button>
            </div>

            {/* Inline Preview */}
            <AnimatePresence>
              {showInlinePreview && (downloadData?.url || chunk.source?.sourceUrl) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "400px" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full border border-border/50 rounded-xl overflow-hidden mt-6 bg-accent/20"
                >
                  <object 
                    data={`${downloadData?.url || chunk.source?.sourceUrl}${chunk.pageNumber ? `#page=${chunk.pageNumber}` : ""}`}
                    type="application/pdf"
                    className="w-full h-full border-0"
                  >
                    <p>Your browser does not support PDFs. <a href={downloadData?.url || chunk.source?.sourceUrl || ""} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download the PDF</a>.</p>
                  </object>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        ) : null}
      </div>
    </div>
  );
}
