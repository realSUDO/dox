const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+|previous\s+|prior\s+)?(instructions|rules|prompts|system prompt)/i,
  /you\s+are\s+now/i,
  /disregard\s+(your|the)\s+(instructions|system prompt|rules)/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /###\s*SYSTEM/i,
];

export function detectPromptInjection(text: string): { isInjected: boolean; match?: string } {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return { isInjected: true, match: match[0] };
    }
  }
  return { isInjected: false };
}
