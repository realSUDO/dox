import { checkInput, InputCheckContext, InputCheckResult } from "./input-checks";
import { checkOutput, OutputCheckContext, OutputCheckResult } from "./output-checks";
import { db } from "@repo/database";
import { logger } from "@repo/logger";

export class GuardrailService {
  async checkInput(query: string, ctx: InputCheckContext): Promise<InputCheckResult> {
    const result = await checkInput(query, ctx);
    await this.persistEvents(result.events, ctx);
    return result;
  }

  async checkOutput(answer: string, ctx: OutputCheckContext): Promise<OutputCheckResult> {
    const result = await checkOutput(answer, ctx);
    await this.persistEvents(result.events, ctx);
    return result;
  }

  private async persistEvents(events: any[], ctx: { userId: string; leafId: string }) {
    if (events.length === 0) return;
    
    try {
      await db.guardrailEvent.createMany({
        data: events.map(e => ({
          userId: ctx.userId,
          leafId: ctx.leafId,
          stage: e.stage,
          rule: e.rule,
          action: e.action,
          payload: e.payload
        }))
      });
    } catch (err) {
      logger.error("[Guardrails] Failed to persist guardrail events", { err, events });
    }
  }
}

export const guardrailService = new GuardrailService();
export { detectPromptInjection } from "./injection";
