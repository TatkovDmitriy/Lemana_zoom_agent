import { z } from 'zod';
import type { MeetingType } from './types.js';

export const MeetingTypeSchema = z.enum([
  'sync',
  'stakeholder',
  'dryrun',
  'review',
  'external',
]) satisfies z.ZodType<MeetingType>;

export const ActionItemSchema = z.object({
  text: z.string().min(1),
  owner: z.string().optional(),
  due: z.string().optional(),
});

export const MinuteOutputSchema = z.object({
  title: z.string().min(1),
  meetingType: MeetingTypeSchema,
  summary: z.string().min(1),
  decisions: z.array(z.string()),
  actionItems: z.array(ActionItemSchema),
  openQuestions: z.array(z.string()),
  nextSteps: z.array(z.string()),
  markdown: z.string(),
});

export const ZoomRecordingFileSchema = z.object({
  id: z.string(),
  file_type: z.string(),
  download_url: z.string().url(),
  play_url: z.string().url().optional(),
  status: z.string(),
});

export const ZoomRecordingCompletedEventSchema = z.object({
  event: z.literal('recording.completed'),
  event_ts: z.number(),
  payload: z.object({
    account_id: z.string(),
    object: z.object({
      id: z.string(),
      uuid: z.string(),
      host_id: z.string(),
      topic: z.string(),
      start_time: z.string(),
      duration: z.number(),
      recording_files: z.array(ZoomRecordingFileSchema),
    }),
  }),
});

export const ZoomUrlValidationEventSchema = z.object({
  event: z.literal('endpoint.url_validation'),
  payload: z.object({
    plainToken: z.string(),
  }),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  obsidianFolder: z.string().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const UpdateMinuteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  projectId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
