import { pipeline } from "@xenova/transformers";

async function run() {
  const pipe = await pipeline("text-classification", "Xenova/ms-marco-MiniLM-L-6-v2");
  const query = "what does project structure say";
  const doc = "Project structure refers to the way in which a project is organized.";
  
  console.log("With [SEP]:", await pipe(`${query} [SEP] ${doc}`, { topk: null }));
  console.log("With two args:", await pipe(query, doc, { topk: null }));
}
run();
