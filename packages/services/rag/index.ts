import { queryRewriter } from "./query-rewriter";
import { retriever } from "./retriever";
import { rrf } from "./rrf";
import { reranker } from "./reranker";
import { cragEvaluator } from "./crag";
import { contextBuilder } from "./context-builder";
import { generator, GenerationResult } from "./generator";
import { logger } from "@repo/logger";
import { db } from "@repo/database";

export interface RAGQueryOptions {
  projectId: string;
  userId: string;
  query: string;
  chatSessionId?: string; // If resuming a session
}

export interface RAGResponse extends GenerationResult {
  chatSessionId: string;
  messageId: string;
}

export class RAGService {
  /**
   * Orchestrates the full RAG pipeline for a given query.
   */
  async query(options: RAGQueryOptions): Promise<RAGResponse> {
    logger.info(`[RAGService] Starting pipeline for query: "${options.query}" (Project: ${options.projectId})`);

    // 1. Fetch Chat History (if session exists)
    let chatSessionId = options.chatSessionId;
    let chatHistory: { role: "user" | "assistant"; content: string }[] = [];

    if (chatSessionId) {
      const historyRows = await db.chatMessage.findMany({
        where: { chatSessionId },
        orderBy: { createdAt: "asc" },
        take: 6, // Last 3 turns (user + assistant * 3)
      });
      chatHistory = historyRows.map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      }));
    } else {
      // Create new session
      const session = await db.chatSession.create({
        data: {
          projectId: options.projectId,
          userId: options.userId,
          title: options.query.substring(0, 50),
        },
      });
      chatSessionId = session.id;
    }

    const historyContext = chatHistory
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n");

    // 1.5 Fetch Project Context (Summaries & File Trees)
    const sources = await db.source.findMany({
      where: { projectId: options.projectId, status: "indexed" },
      select: { metadata: true, fileName: true }
    });
    
    let projectContext = "";
    const fileTrees: string[] = [];
    const summaries: string[] = [];
    
    for (const s of sources) {
      if (s.metadata && typeof s.metadata === 'object') {
        const meta = s.metadata as any;
        if (meta.summary) summaries.push(`- ${s.fileName || 'Source'}: ${meta.summary}`);
        if (meta.fileTree && Array.isArray(meta.fileTree)) {
          fileTrees.push(...meta.fileTree);
        }
      }
    }
    
    if (summaries.length > 0) {
      projectContext += `Project Summaries:\n${summaries.join("\n")}\n\n`;
    }
    if (fileTrees.length > 0) {
      projectContext += `Project File Structure (Available Documents & Directories):\n${fileTrees.slice(0, 100).map(f => `- ${f}`).join("\n")}\n\n`;
    }

    // 2. Query Rewrite & Analysis
    const rewrite = await queryRewriter.rewrite(options.query, historyContext, projectContext);
    
    // Gather all queries to search for
    const activeQueries = [rewrite.rewrittenQuery, rewrite.hydePassage, ...rewrite.subQueries];
    // We optionally use stepBackQuery for a wider net, let's include it
    if (rewrite.stepBackQuery) activeQueries.push(rewrite.stepBackQuery);

    // 3-6. Retrieval, RRF, Rerank, and CRAG Fallback Loop
    let finalChunks: any[] = [];
    let attempts = 0;
    const maxAttempts = 5;
    let limit = 20;

    while (attempts < maxAttempts) {
      attempts++;
      logger.debug(`[RAGService] Retrieval attempt ${attempts} (limit: ${limit})`);
      
      const retrievalLists = await retriever.retrieve(options.projectId, activeQueries, limit);
      const rrfChunks = rrf.merge(retrievalLists, 30 + (attempts * 10));
      const rerankedChunks = await reranker.rerank(rewrite.rewrittenQuery, rrfChunks, 8 + (attempts * 2));
      
      const cragResult = cragEvaluator.evaluate(rerankedChunks);
      finalChunks = cragResult.passed;
      
      if (!cragResult.needsFallback) {
        break; // We have enough chunks
      }
      
      if (attempts < maxAttempts) {
        logger.warn(`[RAGService] CRAG fallback triggered (attempt ${attempts}). Only ${finalChunks.length} chunks passed. Expanding search.`);
        limit += 20; // Widen search space for next attempt
      } else {
        logger.warn(`[RAGService] Max CRAG retries reached. Proceeding with ${finalChunks.length} chunks.`);
      }
    }

    // 7. Context Assembly
    const context = contextBuilder.build(finalChunks);

    // 8. LLM Generation
    const generation = await generator.generate(
      rewrite.rewrittenQuery, 
      context, 
      chatHistory,
      rewrite.expectedLength,
      projectContext
    );

    // 9. Persist to Database
    // Insert user message
    await db.chatMessage.create({
      data: {
        chatSessionId,
        role: "user",
        content: options.query,
      },
    });

    // Insert assistant message
    const assistantMsg = await db.chatMessage.create({
      data: {
        chatSessionId,
        role: "assistant",
        content: generation.answer,
        promptTokens: generation.usage.promptTokens,
        completionTokens: generation.usage.completionTokens,
      },
    });

    // Insert citations
    if (generation.citations.length > 0) {
      await db.citation.createMany({
        data: generation.citations.map((c) => ({
          messageId: assistantMsg.id,
          chunkId: c.chunkId,
          sourceId: c.sourceId,
          score: c.score,
          displayLabel: c.displayLabel,
        })),
      });
    }

    logger.info(`[RAGService] Pipeline complete. Generated ${generation.citations.length} citations.`);

    return {
      ...generation,
      chatSessionId,
      messageId: assistantMsg.id,
    };
  }
}

export const ragService = new RAGService();
