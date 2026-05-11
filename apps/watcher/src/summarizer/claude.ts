import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { buildSummaryPrompt } from './prompt.js';
import { parseMinuteOutput } from './parse.js';
import { renderMinuteMarkdown } from '@lemana/shared';
import type { MeetingInput, MinuteOutput } from '@lemana/shared';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — аналитик встреч компании Лемана Про. Создаёшь структурированные протоколы встреч по транскриптам Zoom. Отвечаешь только валидным JSON, без пояснений и markdown-блоков.`;

export async function summarize(input: MeetingInput, catalogUrl: string): Promise<MinuteOutput> {
  const userPrompt = buildSummaryPrompt(input);

  const message = await client.messages.create({
    model: config.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // Prompt caching: system prompt is stable — cache it
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Anthropic returned no text block');
  }

  const output = parseMinuteOutput(textBlock.text);
  output.markdown = renderMinuteMarkdown(output, input, catalogUrl);
  return output;
}
