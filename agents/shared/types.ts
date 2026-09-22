export type AgentKind = 'create' | 'cover' | 'mashup' | 'sample' | 'vocal' | 'beat';

export type GenerationStatus = 'queued' | 'running' | 'ready' | 'failed';

export type VocalMode = 'auto_lyrics' | 'exact_lyrics' | 'instrumental';

export type SunoModel =
  | 'V4'
  | 'V4_5'
  | 'V4_5PLUS'
  | 'V4_5ALL'
  | 'V5'
  | 'V5_5'
  | 'V6'
  | 'V6_WILD'
  | 'V6_MINI';


export type TimestampMs = number;

export type EntityBase = {
  id: string;
  createdAt: TimestampMs;
};
