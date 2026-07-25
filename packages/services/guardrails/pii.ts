export const PII_REGEXES = [
  { name: "Email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: "Phone", regex: /(\+?\d[\d\s\-().]{7,}\d)/g },
  { name: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: "Credit Card", regex: /\b(?:\d[ -]?){13,16}\b/g }
];

export function maskPII(text: string): { maskedText: string; piiMap: Map<string, string>; matches: { pattern: string; redacted: string }[] } {
  let maskedText = text;
  const piiMap = new Map<string, string>();
  const matches: { pattern: string; redacted: string }[] = [];
  let placeholderCount = 1;

  for (const { name, regex } of PII_REGEXES) {
    maskedText = maskedText.replace(regex, (match) => {
      const placeholder = `[PII_REDACTED_${placeholderCount++}]`;
      piiMap.set(placeholder, match);
      
      // Store a sanitized version (e.g. first 2 chars + ***)
      const sanitized = match.substring(0, 2) + "***";
      matches.push({ pattern: name, redacted: sanitized });
      
      return placeholder;
    });
  }

  return { maskedText, piiMap, matches };
}

export function restorePII(text: string, piiMap: Map<string, string>): string {
  let restoredText = text;
  for (const [placeholder, original] of piiMap.entries()) {
    // LLMs might change case or punctuation, but usually exact match works for placeholders
    restoredText = restoredText.replace(new RegExp(`\\[PII_REDACTED_${placeholder.match(/\d+/)?.[0]}\\]`, 'g'), original);
  }
  return restoredText;
}
