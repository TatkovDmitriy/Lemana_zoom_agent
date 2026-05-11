// Types inlined from @lemana/shared to keep Docker build self-contained
// (Railway Root Directory = apps/zoom-bot → no access to packages/shared).

export type JobStatus = 'pending' | 'in_progress' | 'done' | 'failed';

export type ProcessRecordingPayload = {
  meetingId: string;
  topic: string;
  startedAt: string;
  durationMin: number;
  participants: string[];
  recordingUrl?: string;
  transcriptUrl?: string;
  transcript?: string;
  ownerId: string;
  projectIdHint?: string;
};

export type JoinMeetingPayload = {
  meetingUrl: string;
  password?: string;
  ownerId: string;
  topic?: string;
  projectIdHint?: string;
};

export type Job =
  | {
      id: string;
      type: 'process_recording';
      status: JobStatus;
      payload: ProcessRecordingPayload;
      attempts: number;
      error?: string;
      createdAt: string;
      updatedAt: string;
    }
  | {
      id: string;
      type: 'join_meeting';
      status: JobStatus;
      payload: JoinMeetingPayload;
      attempts: number;
      error?: string;
      createdAt: string;
      updatedAt: string;
    };
