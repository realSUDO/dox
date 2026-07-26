"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, X } from "lucide-react";

export type FileStatus = 'uploading' | 'processing' | 'pending_approval' | 'embedding' | 'success' | 'error';

export interface FilePillProps {
  file: {
    id: string;
    name: string;
    status: FileStatus;
    sourceId?: string;
    errorMessage?: string;
  };
  onRemove?: () => void;
  onApprove?: () => void;
  isApproving?: boolean;
}

export function FilePill({ file, onRemove, onApprove, isApproving }: FilePillProps) {
  const isUploadingOrProcessing = file.status === 'uploading' || file.status === 'processing';
  const isEmbedding = file.status === 'embedding';
  const isPendingApproval = file.status === 'pending_approval';
  const isLoading = isUploadingOrProcessing || isEmbedding;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative rounded-[16px] flex-shrink-0"
    >
      {/* Animated Border SVG - ONLY during embedding or success */}
      {(isEmbedding || file.status === 'success') && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ borderRadius: 16 }}>
          <motion.rect
            x="1" y="1"
            width="calc(100% - 2px)" height="calc(100% - 2px)"
            rx="15" ry="15"
            fill="none"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: file.status === 'success' ? 1 : 0.85 }}
            transition={{
              duration: file.status === 'success' ? 0.4 : 20,
              ease: file.status === 'success' ? "easeOut" : "circOut"
            }}
          />
        </svg>
      )}

      {/* Pill Content */}
      <div 
        className={`relative flex items-center gap-2 rounded-[16px] pl-3 pr-2 py-1.5 shadow-sm text-sm transition-colors border m-[2px] ${
          isPendingApproval
            ? "bg-primary/10 border-primary/30 text-primary"
            : (isEmbedding || file.status === 'success')
            ? "bg-card border-transparent text-foreground"
            : "bg-card border-border text-foreground"
        }`}
      >
        {isLoading && <Loader2 size={16} className="animate-spin text-primary shrink-0" />}
        {file.status === 'pending_approval' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
        {file.status === 'success' && <CheckCircle2 size={16} className="text-primary shrink-0" />}
        {file.status === 'error' && <X size={16} className="text-red-500 shrink-0" />}
        
        <div className="flex flex-col justify-center">
          <span className="truncate max-w-[150px] font-medium leading-tight">{file.name}</span>
          {file.errorMessage && (
            <span className="text-[10px] text-red-500 max-w-[200px] truncate leading-tight" title={file.errorMessage}>
              {file.errorMessage}
            </span>
          )}
        </div>

        {file.status === 'pending_approval' && onApprove && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onApprove(); }}
            disabled={isApproving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full py-1 px-3 transition-all flex items-center gap-1.5 shrink-0 ml-2 shadow-sm hover:shadow-md disabled:opacity-50"
          >
            <span className="text-xs font-semibold tracking-wide uppercase">Approve</span>
          </button>
        )}
        
        {(file.status === 'error') && onRemove && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onRemove(); }}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-red-500"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
