/**
 * Prompt Injection & Parameter Tampering Guardrail
 * Detects and neutralizes adversarial prompt injection attempts designed to
 * alter backend system instructions, exfiltrate API keys, change callback URLs,
 * or override generation parameter bounds.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|the)\s+(instructions|rules|system|prompts)/i,
  /disregard\s+(all\s+)?(rules|instructions|constraints|system)/i,
  /system\s+prompt/i,
  /return\s+(the\s+)?.*key/i,
  /send\s+(the\s+)?.*to/i,
  /set\s+(audio_weight|style_weight|weirdness_constraint)\s+to/i,
  /change\s+(the\s+)?callback(\s*url)?/i,
  /disable\s+(validation|security|rules|limits)/i,
  /developer\s+mode/i,
  /bypass\s+(safety|guardrails|filters|security)/i,
];

export type PromptSanitizationResult = {
  safeText: string;
  hasInjectionAttempt: boolean;
  neutralizedPatterns: string[];
};

/**
 * Scans and sanitizes user input against prompt injection vectors.
 * If an attack pattern is detected, strips or neutralizes it while preserving
 * genuine musical intent.
 */
export function sanitizeUserPrompt(rawPrompt: string): PromptSanitizationResult {
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return { safeText: '', hasInjectionAttempt: false, neutralizedPatterns: [] };
  }

  let cleaned = rawPrompt;
  const neutralized: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      neutralized.push(pattern.source);
      cleaned = cleaned.replace(pattern, '[filtered-instruction]');
    }
  }

  // Ensure prompt cannot inject JSON or fake configuration keys
  cleaned = cleaned.replace(/\{\s*"model"\s*:/gi, '{ "user_tag":')
                   .replace(/\{\s*"api_key"\s*:/gi, '{ "user_tag":')
                   .replace(/bearer\s+[a-z0-9_-]{16,}/gi, '[redacted-token]');

  return {
    safeText: cleaned.trim(),
    hasInjectionAttempt: neutralized.length > 0,
    neutralizedPatterns: neutralized,
  };
}

/**
 * Ensures system parameters cannot be overridden by user input text.
 * Strictly clamps weights into valid [0.0, 1.0] ranges regardless of user text.
 */
export function clampParameterWeight(userValue: number | undefined, defaultValue = 0.65): number {
  if (userValue == null || isNaN(userValue)) return defaultValue;
  return Math.min(1.0, Math.max(0.0, Number(userValue.toFixed(2))));
}
