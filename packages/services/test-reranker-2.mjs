import { pipeline } from "@xenova/transformers";

async function run() {
  const pipe = await pipeline("text-classification", "Xenova/ms-marco-MiniLM-L-6-v2");
  
  const query = "what does project structure say";
  const doc1 = "Project structure refers to the way in which a project is organized.";
  const doc2 = "The dog ran across the street and barked at the mailman.";
  
  console.log("Relevant:", await pipe(`${query} [SEP] ${doc1}`, { topk: null }));
  console.log("Irrelevant:", await pipe(`${query} [SEP] ${doc2}`, { topk: null }));
}
run();
