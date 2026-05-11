import { MinuteOutputSchema } from '@lemana/shared';
import type { MinuteOutput } from '@lemana/shared';

export function parseMinuteOutput(raw: string): MinuteOutput {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(`LLM returned non-JSON: ${clean.slice(0, 200)}`);
  }
  const result = MinuteOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`LLM output schema mismatch: ${JSON.stringify(result.error.flatten())}`);
  }
  return { ...result.data, markdown: '' }; // markdown filled by caller
}
