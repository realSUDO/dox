import { ragService } from "./packages/services/dist/rag/index.js";
import { db } from "./packages/database/dist/index.js";

async function run() {
  const leaf = await db.leaf.findFirst();
  const res = await ragService.query({
    leafId: leaf.id,
    userId: leaf.ownerId,
    query: "what did openai do to huggingface"
  });
  console.log("FINAL ANSWER:");
  console.log(res.answer);
  console.log("CITATIONS:");
  console.log(res.citations);
}

run().catch(console.error);
