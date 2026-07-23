import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export function extractHtml(htmlContent: string, url?: string): string {
  // Use Readability to extract main content
  const doc = new JSDOM(htmlContent, { url });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();

  if (article && article.textContent) {
    return article.textContent.trim();
  }

  // Fallback to cheerio if Readability fails
  const $ = cheerio.load(htmlContent);
  // Remove scripts, styles, nav, footer, header
  $("script, style, nav, footer, header, noscript, svg").remove();
  
  return $("body").text().replace(/\s+/g, " ").trim();
}
