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
  displayLabel: string;
  sourceId: string;
  chunkId: string;
}

export function CitationChip({ index, displayLabel, sourceId, chunkId }: CitationChipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="text-[10px] h-4 px-1 py-0 rounded-sm cursor-pointer mx-1 align-top relative -top-1 border border-primary/20 hover:border-primary/50 transition-colors"
            onClick={() => {
              // MVP deep-link: just log for now or show a toast
              console.log("Deep link to", { sourceId, chunkId });
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
