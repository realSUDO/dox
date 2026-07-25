import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Adding sub_file_name column to chunks table...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE chunks ADD COLUMN sub_file_name VARCHAR(500);`);
    console.log("Successfully added sub_file_name column.");
  } catch (err: any) {
    if (err.message?.includes("already exists")) {
      console.log("Column already exists.");
    } else {
      console.error("Error adding column:", err);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
