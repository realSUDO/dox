import Tesseract from "tesseract.js";

export async function extractImageOcr(filePath: string): Promise<string> {
  const result = await Tesseract.recognize(filePath, "eng", {
    // You can configure logger to see progress if needed
    // logger: m => console.log(m)
  });

  return result.data.text;
}
