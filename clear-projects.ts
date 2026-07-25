import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.project.deleteMany({});
  console.log("Cleared all projects from database.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
