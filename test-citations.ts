import { db } from "@repo/database";
async function run() {
  const latestMessage = await db.chatMessage.findFirst({
    where: { role: 'assistant' },
    orderBy: { createdAt: 'desc' },
    include: { citations: { include: { chunk: true, source: true } } }
  });
  console.log("Response:", latestMessage?.content);
  latestMessage?.citations.forEach(c => {
    console.log(`Citation ${c.displayLabel}: ${c.chunk.subFileName}, startSeconds=${c.chunk.startSeconds}`);
  });
}
run().catch(console.error).finally(() => process.exit(0));
