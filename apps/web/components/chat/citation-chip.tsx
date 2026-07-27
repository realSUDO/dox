"use client";

import React from "react";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface CitationChipProps {
  index: number;
  displayLabel?: string | null;
  sourceId: string;
  chunkId: string;
  score?: number | null;
  onClick?: (citation: { index: number; displayLabel?: string | null; sourceId: string; chunkId: string; score?: number | null }) => void;
}

export function CitationChip({ index, displayLabel, sourceId, chunkId, score, onClick }: CitationChipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="text-[10px] h-4 px-1 py-0 rounded-sm cursor-pointer mx-1 align-top relative -top-1 border border-primary/20 hover:border-primary/50 transition-colors"
            onClick={() => {
              if (onClick) {
                onClick({ index, displayLabel, sourceId, chunkId, score });
              }
            }}
          >
            {index}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs bg-popover text-popover-foreground">
          <p className="font-semibold mb-1">Source {index}</p>
          {displayLabel && <p className="text-muted-foreground">{displayLabel}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
