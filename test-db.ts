import { db } from "./packages/database/src/index.js";
async function run() {
  try {
    const leafs = await db.leaf.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });
    console.log("Success:", leafs.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
