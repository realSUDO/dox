/**
 * Smoke test: EmbeddingService
 * Run: dotenv -e ../../.env -- tsx packages/services/scripts/test-embed.ts
 */
import { embeddingService } from "../embedding";

async function main() {
  console.log("🧪 Testing EmbeddingService...\n");

  // Test 1: Single embed
  console.log("Test 1: embedSingle");
  const vector = await embeddingService.embedSingle(
    "The quick brown fox jumps over the lazy dog",
  );
  console.assert(Array.isArray(vector), "vector should be an array");
  console.assert(vector.length === 1536, `vector dim should be 1536, got ${vector.length}`);
  console.log(`✅ Single embed OK — dim=${vector.length}`);

  // Test 2: Batch embed
  console.log("\nTest 2: embedBatch");
  const texts = [
    "Introduction to machine learning",
    "Neural networks and deep learning",
    "Natural language processing fundamentals",
  ];
  const vectors = await embeddingService.embedBatch(texts);
  console.assert(vectors.length === texts.length, `batch count mismatch`);
  console.assert(vectors[0]?.length === 1536, `batch vector dim wrong`);
  console.log(`✅ Batch embed OK — ${vectors.length} vectors, dim=${vectors[0]?.length}`);

  // Test 3: Empty batch
  console.log("\nTest 3: empty batch");
  const empty = await embeddingService.embedBatch([]);
  console.assert(empty.length === 0, "empty batch should return []");
  console.log("✅ Empty batch OK");

  console.log("\n🎉 All embedding tests passed!");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
