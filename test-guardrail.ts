import { db } from "./packages/database/src/index.js";
async function run() {
  try {
    const events = await db.guardrailEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    console.log(JSON.stringify(events, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
