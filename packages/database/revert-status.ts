import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sources = await prisma.source.findMany({
    where: { status: "embedding" }
  });

  for (const source of sources) {
    // Check if it's genuinely stuck (has pending chunks but no active embed workers picking it up)
    const chunks = await prisma.chunk.count({
      where: { sourceId: source.id, status: "pending" }
    });

    if (chunks > 0) {
      console.log(`Reverting source ${source.id} back to 'pending_approval' (Chunks: ${chunks})`);
      await prisma.source.update({
        where: { id: source.id },
        data: { status: "pending_approval" }
      });
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
