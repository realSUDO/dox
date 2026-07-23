import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Ensure pdf.js uses a dummy worker or configures it correctly for Node.js
// Since we are running in Node, we don't strictly need the web worker.

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export async function extractPdf(filePath: string): Promise<ExtractedPage[]> {
  const loadingTask = pdfjsLib.getDocument({ url: filePath });
  const pdfDocument = await loadingTask.promise;

  const numPages = pdfDocument.numPages;
  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    
    const strings = textContent.items.map((item: any) => item.str);
    const text = strings.join(" ");

    pages.push({
      pageNumber: i,
      text,
    });
  }

  return pages;
}
