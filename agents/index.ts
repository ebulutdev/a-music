export { createLogger, getLogBuffer, clearLogBuffer, logsFor } from './shared/logger';
export { measure, assertBudget } from './shared/perf';
export { AgentError } from './shared/errors';
export { createId } from './shared/ids';
export { resetAllLocal, readAllLocal, upsertLocal } from './shared/persist';

export { getSunoClient, shouldUseMockSuno } from './suno/client';

export {
  seedVoiceProfiles,
  listVoiceProfiles,
  listSavedVocals,
  toggleSavedVocal,
  selectedSavedVocals,
  saveVocalClip,
  normalizeWaveform,
  selectedPersonas,
  processStepAt,
  PROCESS_STEPS,
  VOCAL_MAX_MS,
  SEED_VOICES,
  separateAudioVocals,
} from './vocal/agent';
export type { SeparateVocalsInput } from './vocal/agent';

export {
  seedBeats,
  listSavedBeats,
  toggleSavedBeat,
  saveBeatClip,
  generateInstrumentalBeat,
  validateInstrumentalBeat,
} from './beat/agent';
export type { GenerateInstrumentalBeatInput } from './beat/agent';
export type {
  KieMusicModel,
  KieAddInstrumentalRequest,
  KieCoverModel,
  KieSeparationType,
  KieSeparateVocalsRequest,
  SunoTask,
  SunoTaskAudio,
} from './suno/types';

export {
  HUMANIZER_PRESETS,
  normalizeTurkishSpeechText,
  numberToTurkishWords,
  planSpeechPerformance,
  planVocalArrangement,
  generateHarmonicBeatPrompt,
  registerCustomVocalModifier,
  applyCustomVocalModifiers,
  createStudioVocalGraph,
} from './vocal/humanizer';
export type {
  VocalHumanizerPreset,
  VocalHumanizerOptions,
  VocalLayerConfig,
  VocalArrangementPlan,
  SpeechPerformancePlan,
} from './vocal/humanizer';

export { diagnoseKieError, validateAudioUrlForKie, KIE_ERROR_CATALOG } from './suno/diagnostics';
export { createSong, validateCreate, listGenerations } from './create/agent';
export type { CreateInput, GenerationRecord } from './create/agent';
export { checkLyrics } from './create/lyrics';
export { listStyles, seedStyles, SEED_STYLES } from './create/styles';
export { handleKieWebhook } from './suno/webhook';
export { validateKieGenerateRequest, validateKieMashupRequest, validateWeightRange } from './suno/validation';
export { withProviderRetry } from './suno/retry';
export { isSafeExternalUrl, assertSafeExternalUrl } from './security/ssrf';
export { validateAudioUpload, sanitizeAudioFilename, assertClipOwnership } from './security/audio';
export { sanitizeUserPrompt, clampParameterWeight } from './security/prompt';
export { checkRateLimit, checkConcurrencyLimit } from './shared/rate-limiter';
export { computeRequestFingerprint, processIdempotency } from './shared/idempotency';
export { formatMobileAccepted, formatMobileSuccess, formatMobileError, sanitizeErrorMessage } from './shared/mobile-contract';
export {
  cuesAt,
  fallbackTrack,
  parseCues,
  persistLyricTrack,
  resolveLyricTrack,
  scaleLrc,
  titleFromFileName,
  FALLBACK_TR_LRC,
  groupAlignedWordsIntoLines,
  findActiveWordAndLine,
} from './lyrics/engine';
export type { LyricCue, LyricFrame, LyricSource, LyricTrack, AlignedLyricsLine } from './lyrics/engine';

export { createMashup, validateMashup } from './mashup/agent';
export { createCover, validateCover } from './cover/agent';
export { createSample, validateSample } from './sample/agent';
export {
  seedLibrary,
  listLibrary,
  addToLibrary,
  shuffleIds,
  recordPlay,
  timedList,
} from './library/agent';

export type { VoiceProfile, AudioClip, SavedVocal, ProcessStep } from './vocal/agent';
export type { SavedBeat } from './beat/agent';
export type { LibraryRow, Song, LibraryItem } from './library/agent';
export type { VocalMode, SunoModel, AgentKind } from './shared/types';
export type { Locale, MessageKey, Vars } from './i18n/messages';

export { runAdvocate } from './advocate/invariants';
export { translate, loadLocale, saveLocale, translateError, styleMessageKey } from './i18n/locale';

// ============================================================================
// MODÜLER MÜZİK ZEKA & KİŞİSELLEŞTİRME KATMANI (İsteğe bağlı - kolayca açılıp kapatılabilir)
// ============================================================================
export {
  runMusicIntelligencePipeline,
  USE_INTELLIGENCE_LAYER,
  parseMusicIntent,
  analyzeVocalProfile,
  getUserTasteVector,
  updateUserTasteFromFeedback,
  compileMusicPrompt,
  rerankCandidates,
} from './intelligence';
export type {
  ParsedMusicIntent,
  VocalProfileAnalysis,
  UserTasteVector,
  CompiledMusicPrompt,
  CandidateTrack,
  CandidateEvaluation,
  FeedbackTag,
} from './intelligence';
