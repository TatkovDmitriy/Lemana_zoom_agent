import { commitFile, getFileContent } from './github.js';
import type { MinuteOutput, MeetingInput } from '@lemana/shared';
import { buildObsidianFileName } from '@lemana/shared';

const DATAVIEW_BLOCK = `\`\`\`dataview
TABLE date, meeting_type, topic, duration_min as "мин", catalog_url as "Каталог"
FROM "{{folder}}/98_Meetings_and_Logs"
WHERE type = "meeting"
SORT date DESC
\`\`\``;

const README_TEMPLATE = `# 📋 Протоколы встреч

Автоматически генерируются агентом [Lemana Zoom Agent].

## Индекс встреч (Dataview)

{{dataview}}

## Последние встречи

{{recent}}

---
> Файлы создаются автоматически после завершения Zoom-встречи.
`;

export async function updateIndexPage(params: {
  obsidianFolder: string;
  output: MinuteOutput;
  input: MeetingInput;
  minuteId: string;
  catalogUrl: string;
}): Promise<void> {
  const { obsidianFolder, output, input, minuteId, catalogUrl } = params;
  const readmePath = `${obsidianFolder}/98_Meetings_and_Logs/README.md`;
  const fileName = buildObsidianFileName(input.startedAt, output.meetingType, input.topic);
  const filePath = `${obsidianFolder}/98_Meetings_and_Logs/${fileName}`;
  const date = new Date(input.startedAt).toISOString().slice(0, 10);

  const existingContent = await getFileContent(readmePath);
  const newEntry = `- [${date} — ${output.title}](${filePath}) | [Каталог](${catalogUrl})`;

  let content: string;
  if (existingContent) {
    // Append to existing recent list
    const marker = '## Последние встречи\n';
    if (existingContent.includes(marker)) {
      content = existingContent.replace(marker, `${marker}\n${newEntry}\n`);
    } else {
      content = existingContent + `\n\n${newEntry}`;
    }
  } else {
    const dataview = DATAVIEW_BLOCK.replace('{{folder}}', obsidianFolder);
    content = README_TEMPLATE.replace('{{dataview}}', dataview).replace(
      '{{recent}}',
      newEntry,
    );
  }

  await commitFile(
    readmePath,
    content,
    `chore: update meetings index for ${minuteId}`,
  );
}
