export type ActionItem = {
  text: string;
  owner?: string;
  due?: string; // ISO date string
};

export type MeetingType = 'sync' | 'stakeholder' | 'dryrun' | 'review' | 'external';

export type MinuteStatus = 'pending' | 'processing' | 'done' | 'failed';

export type Minute = {
  id: string;
  ownerId: string;
  projectId: string;
  title: string;
  date: string;        // ISO
  durationMin: number;
  participants: string[];
  topic: string;
  meetingType: MeetingType;
  zoomMeetingId?: string;
  zoomRecordingUrl?: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
  nextSteps: string[];
  markdown: string;
  tags: string[];
  obsidianPath?: string;
  obsidianCommitSha?: string;
  searchTokens: string[];
  status: MinuteStatus;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  obsidianFolder?: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  telegramUserId?: number;
  createdAt: string;
};

export type MeetingInput = {
  meetingId: string;
  topic: string;
  startedAt: string;       // ISO
  durationMin: number;
  participants: string[];
  recordingUrl?: string;
  transcript: string;
  ownerId: string;
  projectIdHint?: string;
};

export type MinuteOutput = {
  title: string;
  meetingType: MeetingType;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
  nextSteps: string[];
  markdown: string;
};

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

export type ZoomRecordingCompletedEvent = {
  event: 'recording.completed';
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      id: string;
      uuid: string;
      host_id: string;
      topic: string;
      start_time: string;
      duration: number;
      recording_files: Array<{
        id: string;
        file_type: string;
        download_url: string;
        play_url?: string;
        status: string;
      }>;
      participant_audio_files?: Array<{ file_type: string; download_url: string }>;
    };
  };
};
