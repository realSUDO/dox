import { AutoModelForSequenceClassification, AutoTokenizer, pipeline } from "@xenova/transformers";

async function run() {
  const model = await AutoModelForSequenceClassification.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2');
  const tokenizer = await AutoTokenizer.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2');

  const query = "what does project structure say";
  const doc1 = "Project structure refers to the way in which a project is organized.";
  
  const inputs = tokenizer(query, { text_pair: doc1 });
  const { logits } = await model(inputs);
  console.log("Logits:", logits.data);
  
  const doc2 = "The dog ran across the street and barked at the mailman.";
  const inputs2 = tokenizer(query, { text_pair: doc2 });
  const { logits: logits2 } = await model(inputs2);
  console.log("Logits 2:", logits2.data);
}
run();
