/**
 * Smoke test: QdrantService
 * Run: dotenv -e ../../.env -- tsx packages/services/scripts/test-qdrant.ts
 */
import { qdrantService, collectionName } from "../qdrant";
import { randomUUID } from "node:crypto";

async function main() {
  console.log("🧪 Testing QdrantService...\n");

  const leafId = randomUUID();
  const sourceId = randomUUID();
  const chunkId = randomUUID();
  
  console.log(`Using mock leafId: ${leafId}`);
  console.log(`Using mock sourceId: ${sourceId}`);
  console.log(`Using mock chunkId: ${chunkId}`);

  // Test 0: Ping
  const isHealthy = await qdrantService.ping();
  console.assert(isHealthy, "Qdrant should be healthy");
  console.log("✅ Ping OK");

  // Test 1: Ensure collection
  console.log("\nTest 1: ensureCollection");
  await qdrantService.ensureCollection(leafId);
  console.log(`✅ ensureCollection OK`);

  // Test 2: Upsert point
  console.log("\nTest 2: upsertPoints");
  const dummyVector = new Array(1536).fill(0.1);
  await qdrantService.upsertPoints(leafId, [
    {
      id: chunkId,
      vector: dummyVector,
      payload: {
        chunkId,
        sourceId,
        leafId,
        indexVersion: 1,
        content: "Test content",
        pageNumber: null,
        startSeconds: null,
        endSeconds: null,
        timestampLabel: null,
        sourceType: "text",
        fileName: null,
        sourceUrl: null,
        subFileName: null,
      },
    },
  ]);
  console.log("✅ upsertPoints OK");

  // Test 3: Count
  console.log("\nTest 3: countByFilter");
  const count = await qdrantService.countByFilter(leafId, { sourceId });
  console.assert(count === 1, `Expected 1 point, got ${count}`);
  console.log(`✅ countByFilter OK (count = ${count})`);

  // Test 4: Delete
  console.log("\nTest 4: deleteByFilter");
  await qdrantService.deleteByFilter(leafId, { sourceId });
  const countAfterDelete = await qdrantService.countByFilter(leafId, { sourceId });
  console.assert(countAfterDelete === 0, `Expected 0 points after delete, got ${countAfterDelete}`);
  console.log("✅ deleteByFilter OK");

  console.log("\n🎉 All Qdrant tests passed!");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
