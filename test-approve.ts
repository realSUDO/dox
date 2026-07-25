import "dotenv/config";
import { sourceService } from "./packages/services/src/source";
import { db } from "./packages/database/src";

async function main() {
  const sourceId = process.argv[2];
  if (!sourceId) {
    throw new Error("No source ID provided");
  }

  const source = await db.source.findUnique({
    where: { id: sourceId },
    include: { project: true }
  });

  if (!source) throw new Error("Source not found");

  console.log(`Approving source ${sourceId}...`);
  const res = await sourceService.approveSource(source.project.ownerId, sourceId);
  console.log("Result:", res);
}

main().then(() => {
  console.log("Done");
  process.exit(0);
}).catch(e => {
  console.error("FAILED:", e);
  process.exit(1);
});
