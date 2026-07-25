const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "metadata" JSONB;`);
    console.log("Column added");
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
