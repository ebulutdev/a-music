import type {
  KieAddInstrumentalRequest,
  KieSeparateVocalsRequest,
  KieTimestampedLyricsData,
  KieTimestampedLyricsRequest,
  SunoClientPort,
  SunoCoverRequest,
  SunoGenerateRequest,
  SunoMashupRequest,
  SunoTask,
} from './types';

import { createId } from '../shared/ids';
import { createLogger } from '../shared/logger';

const log = createLogger('suno-mock');
const tasks = new Map<string, SunoTask>();

function seed(kind: string, title: string): SunoTask {
  const task: SunoTask = {
    taskId: createId('suno'),
    status: 'ready',
    title,
    audioUrl: `mock://audio/${kind}/${title.replace(/\s+/g, '-').toLowerCase()}`,
  };
  tasks.set(task.taskId, task);
  log.info('mock.task', { kind, taskId: task.taskId, title });
  return task;
}

export const mockSunoClient: SunoClientPort = {
  async generate(req: SunoGenerateRequest) {
    log.debug('mock.generate', { customMode: req.customMode, model: req.model });
    return seed('create', req.title || 'Untitled Vibe');
  },
  async cover(req: SunoCoverRequest) {
    log.debug('mock.cover', { uploadUrl: req.uploadUrl, style: req.style });
    return seed('cover', req.title || 'Cover');
  },
  async mashup(req: SunoMashupRequest) {
    log.debug('mock.mashup', { vocalMode: req.vocalMode });
    return seed('mashup', req.title || 'Mashup');
  },
  async addInstrumental(req: KieAddInstrumentalRequest) {
    log.debug('mock.addInstrumental', { uploadUrl: req.uploadUrl, tags: req.tags, model: req.model });
    return seed('instrumental', req.title || 'Beat Instrumental');
  },
  async separateVocals(req: KieSeparateVocalsRequest) {
    log.debug('mock.separateVocals', { type: req.type, stemName: req.stemName });
    return seed('stem', req.stemName ? `Stem-${req.stemName}` : 'Vocals & Accompaniment');
  },
  async getTimestampedLyrics(req: KieTimestampedLyricsRequest): Promise<KieTimestampedLyricsData> {
    log.debug('mock.timestampedLyrics', { taskId: req.taskId, audioId: req.audioId });
    return {
      alignedWords: [
        { word: 'Gece', startS: 0.0, endS: 1.2, success: true },
        { word: 'ışıklarını', startS: 1.25, endS: 2.4, success: true },
        { word: 'yak', startS: 2.45, endS: 3.4, success: true },
        { word: 'Ritmin', startS: 3.45, endS: 4.5, success: true },
        { word: 'göğsümde', startS: 4.55, endS: 5.6, success: true },
        { word: 'dur', startS: 5.65, endS: 6.8, success: true },
      ],
      waveformData: [0.1, 0.4, 0.8, 0.5, 0.9, 0.3, 0.6, 0.2],
      hootCer: 0.12,
      isStreamed: false,
    };
  },
  async poll(taskId: string) {
    const found = tasks.get(taskId);
    if (!found) return { taskId, status: 'failed', error: 'unknown_task' };
    return found;
  },
};



export function resetMockSuno(): void {
  tasks.clear();
}
