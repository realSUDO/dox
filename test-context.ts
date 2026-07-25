import { contextBuilder } from "./packages/services/rag/context-builder";

const mockChunk = {
  chunkId: "1",
  sourceId: "1",
  content: "This is a test content.",
  startSeconds: 120,
  timestampLabel: "00:02:00",
  pageNumber: null,
  fileName: "class-subtitle.zip",
  subFileName: "class-subtitle/module 10/1. What Is EAS Build Why You Need It & Dev Builds vs Expo Go_epm/1. What Is EAS Build Why You Need It & Dev Builds vs Expo Go_epm.srt",
  sourceUrl: null,
  score: 0.9,
  rrfScore: 0.05,
  rerankScore: 0.8
};

const result = contextBuilder.build([mockChunk as any]);
console.log(result.contextString);
