import { queryRewriter } from "./query-rewriter";
import { retriever } from "./retriever";
import { rrf } from "./rrf";
import { reranker } from "./reranker";
import { cragEvaluator } from "./crag";
import { contextBuilder } from "./context-builder";
import { generator, GenerationResult } from "./generator";
import { logger } from "@repo/logger";
import { db } from "@repo/database";
import { guardrailService } from "../guardrails";
import { creditService } from "../credits";

export interface RAGQueryOptions {
  leafId: string;
  userId: string;
  query: string;
  chatSessionId?: string; // If resuming a session
  piiMap?: Map<string, string>;
  originalQuery?: string;
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
    logger.info(`[RAGService] Starting pipeline for query: "${options.query}" (Leaf: ${options.leafId})`);

    // 0. Pre-check Credits
    const hasEnough = await creditService.hasEnoughTokens(options.userId, 1000); // require at least 1k tokens to start
    if (!hasEnough) {
      throw new Error("OUT_OF_CREDITS");
    }

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
          leafId: options.leafId,
          userId: options.userId,
          title: options.query.substring(0, 50),
        },
      });
      chatSessionId = session.id;
    }

    const historyContext = chatHistory
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n");

    // 1.5 Fetch Leaf Context (Summaries & File Trees)
    const sources = await db.source.findMany({
      where: { leafId: options.leafId, status: "indexed" },
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
      projectContext += `Leaf Summaries:\n${summaries.join("\n")}\n\n`;
    }
    if (fileTrees.length > 0) {
      projectContext += `Leaf File Structure (Available Documents & Directories):\n${fileTrees.slice(0, 100).map(f => `- ${f}`).join("\n")}\n\n`;
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
    const maxAttempts = 3;
    let limit = 20;
    let prevUniqueCount = -1;

    while (attempts < maxAttempts) {
      attempts++;
      logger.debug(`[RAGService] Retrieval attempt ${attempts} (limit: ${limit})`);
      
      const retrievalLists = await retriever.retrieve(options.leafId, activeQueries, limit);
      const rrfChunks = rrf.merge(retrievalLists, 30 + (attempts * 10));

      // Early exit: if RRF found 0 chunks, there's nothing in the KB to retrieve
      if (rrfChunks.length === 0) {
        logger.warn(`[RAGService] No chunks retrieved at all — KB may be empty for this leaf.`);
        break;
      }

      // Early exit: if widening the search didn't find any NEW unique chunks, stop retrying
      // but force-pass everything we have — the user's KB is small, give them SOMETHING
      if (rrfChunks.length === prevUniqueCount) {
        logger.warn(`[RAGService] No new chunks found by widening search (still ${rrfChunks.length}). Force-passing all.`);
        const rerankedAll = await reranker.rerank(rewrite.rewrittenQuery, rrfChunks, 8 + (attempts * 2));
        finalChunks = cragEvaluator.evaluate(rerankedAll, { forceAll: true }).passed;
        break;
      }
      prevUniqueCount = rrfChunks.length;

      const rerankedChunks = await reranker.rerank(rewrite.rewrittenQuery, rrfChunks, 8 + (attempts * 2));
      
      // On the last attempt, force-pass all chunks rather than returning nothing
      const isLastAttempt = attempts >= maxAttempts;
      const cragResult = cragEvaluator.evaluate(rerankedChunks, { forceAll: isLastAttempt });
      finalChunks = cragResult.passed;
      
      if (!cragResult.needsFallback) {
        break; // We have enough chunks
      }
      
      if (!isLastAttempt) {
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

    // 8.5 Output Guardrails
    const outputGuard = await guardrailService.checkOutput(generation.answer, {
      userId: options.userId,
      leafId: options.leafId,
      piiMap: options.piiMap || new Map(),
    });
    const safeAnswer = outputGuard.safeAnswer;

    // 9. Persist to Database
    // Insert user message
    await db.chatMessage.create({
      data: {
        chatSessionId,
        role: "user",
        content: options.originalQuery ?? options.query,
      },
    });

    const assistantMsg = await db.chatMessage.create({
      data: {
        chatSessionId,
        role: "assistant",
        content: safeAnswer,
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
          index: c.index,
          score: c.score,
          displayLabel: c.displayLabel,
        })),
      });
    }

    // 10. Deduct Credits
    const totalTokens = generation.usage.promptTokens + generation.usage.completionTokens;
    if (totalTokens > 0) {
      try {
        await creditService.deductTokens(options.userId, totalTokens);
        logger.info(`[RAGService] Deducted ${totalTokens} tokens from user ${options.userId}`);
      } catch (e: any) {
        logger.error(`[RAGService] Failed to deduct credits post-generation: ${e.message}`);
      }
    }

    logger.info(`[RAGService] Pipeline complete. Generated ${generation.citations.length} citations.`);

    return {
      ...generation,
      answer: safeAnswer,
      chatSessionId,
      messageId: assistantMsg.id,
    };
  }

  /**
   * Fast fallback for when the user has no sources in the knowledge base.
   */
  async emptyStateQuery(options: RAGQueryOptions): Promise<RAGResponse> {
    logger.info(`[RAGService] Fast empty state fallback for query: "${options.query}" (Leaf: ${options.leafId})`);

    let chatSessionId = options.chatSessionId;
    let chatHistory: { role: "user" | "assistant"; content: string }[] = [];

    if (chatSessionId) {
      const historyRows = await db.chatMessage.findMany({
        where: { chatSessionId },
        orderBy: { createdAt: "asc" },
        take: 6,
      });
      chatHistory = historyRows.map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      }));
    } else {
      const session = await db.chatSession.create({
        data: {
          leafId: options.leafId,
          userId: options.userId,
          title: options.query.substring(0, 50),
        },
      });
      chatSessionId = session.id;
    }

    // Save the user's message immediately
    await db.chatMessage.create({
      data: {
        chatSessionId,
        role: "user",
        content: options.query,
      },
    });

    const result = await generator.generateEmptyStateFallback(options.query, chatHistory);

    // Save the assistant's message
    const msg = await db.chatMessage.create({
      data: {
        chatSessionId,
        role: "assistant",
        content: result.answer,
        promptTokens: result.usage.promptTokens,
      },
    });

    return {
      ...result,
      chatSessionId,
      messageId: msg.id,
    };
  }
}

export const ragService = new RAGService();
