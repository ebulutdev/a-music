import type { SunoModel, VocalMode } from '../shared/types';

export type SunoGenerateRequest = {
  customMode: boolean;
  instrumental: boolean;
  model: SunoModel | KieCoverModel;
  prompt: string;
  lyrics?: string;
  style?: string;
  title?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  variety?: number;
  personaId?: string;
  personaModel?: 'voice_persona' | 'style_persona';
  duration?: number;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  callBackUrl?: string;
};


export type KieCoverModel =
  | 'V4'
  | 'V4_5'
  | 'V4_5PLUS'
  | 'V4_5ALL'
  | 'V5'
  | 'V5_5'
  | 'V6'
  | 'V6_WILD'
  | 'V6_MINI';

export type SunoCoverRequest = {
  uploadUrl: string;
  customMode: boolean;
  instrumental: boolean;
  model: SunoModel | KieCoverModel;
  prompt: string;
  style?: string;
  title?: string;
  vocalGender?: 'm' | 'f';
  audioWeight?: number;
  styleWeight?: number;
  weirdnessConstraint?: number;
  negativeTags?: string;
  personaId?: string;
  personaModel?: 'voice_persona' | 'style_persona';
  imageUrls?: string[];
  duration?: number;
  callBackUrl?: string;
};


export const DEFAULT_KIE_MODEL: KieMusicModel = 'V6_WILD';

export type SunoMashupRequest = {
  model?: string | SunoModel;
  uploadUrlList: [string, string];
  customMode?: boolean;
  instrumental?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  duration?: number;
  vocalMode?: VocalMode;
  lyrics?: string;
  callBackUrl?: string;
};


export type KieMusicModel = 'V4_5PLUS' | 'V5' | 'V5_5' | 'V6' | 'V6_MINI' | 'V6_WILD';

export type KieAddInstrumentalRequest = {
  uploadUrl: string;
  title: string;
  tags: string;
  negativeTags?: string;
  model?: KieMusicModel;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  callBackUrl?: string;
};

export type KieSeparationType = 'separate_vocal' | 'split_stem' | 'split_stem_advanced';

export type KieSeparateVocalsRequest = {
  taskId?: string;
  audioId?: string;
  audioUrl?: string;
  type?: KieSeparationType;
  stemName?: string;
  callBackUrl?: string;
};

export type KieAlignedWord = {
  word: string;
  startS: number;
  endS: number;
  success?: boolean;
  palign?: number;
};

export type KieTimestampedLyricsRequest = {
  taskId: string;
  audioId: string;
  callBackUrl?: string;
};

export type KieTimestampedLyricsData = {
  alignedWords: KieAlignedWord[];
  waveformData?: number[];
  hootCer?: number;
  isStreamed?: boolean;
};

export type SunoTask = {
  taskId: string;
  status: 'queued' | 'running' | 'ready' | 'failed';
  audioUrl?: string;
  title?: string;
  error?: string;
};

export type SunoClientPort = {
  generate: (req: SunoGenerateRequest) => Promise<SunoTask>;
  cover: (req: SunoCoverRequest) => Promise<SunoTask>;
  mashup: (req: SunoMashupRequest) => Promise<SunoTask>;
  addInstrumental: (req: KieAddInstrumentalRequest) => Promise<SunoTask>;
  separateVocals: (req: KieSeparateVocalsRequest) => Promise<SunoTask>;
  getTimestampedLyrics: (req: KieTimestampedLyricsRequest) => Promise<KieTimestampedLyricsData>;
  poll: (taskId: string) => Promise<SunoTask>;
};



