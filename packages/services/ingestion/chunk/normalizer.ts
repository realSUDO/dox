export function normalizeText(text: string): string {
  // 1. Strip null bytes and control chars (except tab and newline)
  // eslint-disable-next-line no-control-regex
  let cleaned = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  
  // 2. Normalize to NFC
  cleaned = cleaned.normalize("NFC");
  
  // 3. Collapse > 3 blank lines into 2
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");
  
  // 4. Trim spaces
  return cleaned.trim();
}
