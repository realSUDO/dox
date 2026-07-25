import { sourceService } from "../source";
import { db } from "@repo/database";

async function main() {
  const sourceId = process.argv[2];
  
  if (!sourceId) {
    console.error("Please provide a sourceId as an argument.");
    process.exit(1);
  }

  console.log(`Approving source: ${sourceId}`);
  
  // Find the owner of this source to bypass permission checks easily for the script
  const source = await db.source.findUnique({
    where: { id: sourceId },
    include: { project: true }
  });

  if (!source) {
    console.error("Source not found in DB.");
    process.exit(1);
  }

  if (source.status !== "pending_approval") {
    console.error(`Source is in status '${source.status}', not 'pending_approval'`);
    process.exit(1);
  }

  console.log(`Current metadata:`, JSON.stringify(source.metadata, null, 2));
  console.log("Approving...");

  try {
    const result = await sourceService.approveSource(source.project.ownerId, sourceId);
    console.log("Successfully approved!", result);
  } catch (error) {
    console.error("Failed to approve:", error);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
