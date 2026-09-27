import { AgentError } from '../shared/errors';
import { createLogger } from '../shared/logger';
import { measure } from '../shared/perf';
import { diagnoseKieError, validateAudioUrlForKie } from './diagnostics';
import { mockSunoClient } from './mock';
import { validateKieGenerateRequest, validateKieMashupRequest, validateWeightRange } from './validation';
import type {
  KieAddInstrumentalRequest,
  KieAlignedWord,
  KieSeparateVocalsRequest,
  KieTimestampedLyricsData,
  KieTimestampedLyricsRequest,
  SunoClientPort,
  SunoCoverRequest,
  SunoGenerateRequest,
  SunoMashupRequest,
  SunoTask,
} from './types';

const log = createLogger('suno');

function envFlag(name: string, fallback: string): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const local = window.localStorage.getItem(name);
    if (local != null && local !== '') return local;
  }
  const meta = import.meta as { env?: Record<string, string | boolean | undefined> };
  const value = meta.env?.[name];
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return typeof value === 'string' ? value : fallback;
}

export function resolveApiKey(): string {
  return envFlag('VITE_SUNO_API_KEY', '') || envFlag('VITE_KIE_API_KEY', '');
}

export function shouldUseMockSuno(): boolean {
  const meta = import.meta as { env?: Record<string, string | boolean | undefined> };
  if (meta.env?.MODE === 'test') {
    return true;
  }
  const key = resolveApiKey();
  const forced = envFlag('VITE_USE_MOCK_SUNO', 'false');
  return forced === 'true' || !key;
}

function resolveApiBase(): string {
  const base = envFlag('VITE_SUNO_API_BASE', 'https://api.kie.ai').replace(/\/$/, '');
  // In dev browser environment, route through Vite proxy /kie-api to avoid CORS restrictions if targeting api.kie.ai
  if (typeof window !== 'undefined' && base.includes('api.kie.ai')) {
    return '/kie-api';
  }
  return base;
}

async function requestJson(path: string, body: unknown): Promise<SunoTask> {
  const base = resolveApiBase();
  const key = resolveApiKey();
  const url = `${base}${path}`;
  log.info('suno.http', { path, hasKey: Boolean(key) });

  const { value, ms } = await measure('suno.http', async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      log.error('suno.network_failure', { url, error: String(networkError), body });
      throw new AgentError(
        'KIE_NETWORK_CORS',
        `[Ağ / CORS Bağlantı Hatası]: '${url}' adresine ulaşılamadı. ` +
          `Tarayıcı güvenlik engeli (CORS) veya internet bağlantısı sorunu olabilir. ` +
          `Detay: ${String(networkError)}`,
        true,
      );
    }

    if (!res.ok) {
      const text = await res.text();
      throw diagnoseKieError(res.status, text, path, body);
    }

    const json = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: { taskId?: string; id?: string };
      taskId?: string;
      id?: string;
    };

    if (json.code && json.code !== 200) {
      throw diagnoseKieError(json.code, json.msg || 'Request failed', path, body);
    }

    return json;
  }, 8000);

  const taskId = value.data?.taskId || value.data?.id || value.taskId || value.id;
  if (!taskId) {
    log.error('suno.missing_task_id', { response: value, path, body });
    throw new AgentError('SUNO_TASK', `Kie.ai yanıtında taskId bulunamadı: ${JSON.stringify(value)}`);
  }

  log.perf('suno.accepted', { path, taskId, ms });
  return { taskId, status: 'queued' };
}

export const liveSunoClient: SunoClientPort = {
  generate: (req: SunoGenerateRequest) => {
    validateKieGenerateRequest(req, shouldUseMockSuno());
    const callBackUrl = req.callBackUrl || envFlag('VITE_SUNO_CALLBACK_URL', '');
    const model = req.model || 'V6_WILD';

    const input: Record<string, unknown> = {
      custom_mode: req.customMode,
      instrumental: req.instrumental,
      model,
    };

    if (req.customMode) {
      input.title = (req.title || 'Vibe').slice(0, 100);
      if (!req.instrumental) {
        input.prompt = (req.lyrics || req.prompt || '').slice(0, 5000);
        if (req.lyrics) input.lyrics = req.lyrics.slice(0, 5000);
      }
      if (req.style) input.style = req.style.slice(0, 1000);
      if (req.negativeTags) input.negative_tags = req.negativeTags;
      if (req.vocalGender) input.vocal_gender = req.vocalGender;
      if (req.styleWeight != null) input.style_weight = Number(req.styleWeight.toFixed(2));
      if (req.weirdnessConstraint != null) input.weirdness_constraint = Number(req.weirdnessConstraint.toFixed(2));
      if (req.audioWeight != null) input.audio_weight = Number(req.audioWeight.toFixed(2));
      if (req.personaId) input.persona_id = req.personaId;
      if (req.personaModel) input.persona_model = req.personaModel;
      if (req.duration && model === 'V5_5') input.duration = req.duration;
    } else {
      input.prompt = (req.prompt || 'A beautiful upbeat track').slice(0, 500);
      if (req.imageUrls?.length) input.image_urls = req.imageUrls.slice(0, 5);
    }

    return requestJson('/api/v1/jobs/createTask', {
      model: 'ai-music-api/generate',
      ...(callBackUrl ? { callBackUrl } : {}),
      input,
    });
  },

  cover: (req: SunoCoverRequest) => {
    validateAudioUrlForKie(req.uploadUrl, 'Cover (Upload & Cover Audio)', shouldUseMockSuno());
    validateWeightRange('audio_weight', req.audioWeight);
    validateWeightRange('style_weight', req.styleWeight);
    validateWeightRange('weirdness_constraint', req.weirdnessConstraint);
    const callBackUrl = req.callBackUrl || envFlag('VITE_SUNO_CALLBACK_URL', '');
    const model = req.model || 'V6_WILD';

    const input: Record<string, unknown> = {
      upload_url: req.uploadUrl,
      custom_mode: req.customMode,
      instrumental: req.instrumental,
      model,
    };

    if (req.customMode) {
      input.title = (req.title || 'Cover').slice(0, 100);
      input.style = (req.style || 'Pop').slice(0, 1000);
      if (!req.instrumental) {
        input.prompt = (req.prompt || '').slice(0, 5000);
      }
      if (req.negativeTags) input.negative_tags = req.negativeTags;
      if (req.vocalGender) input.vocal_gender = req.vocalGender;
      if (req.styleWeight != null) input.style_weight = Number(req.styleWeight.toFixed(2));
      if (req.weirdnessConstraint != null) input.weirdness_constraint = Number(req.weirdnessConstraint.toFixed(2));
      if (req.audioWeight != null) input.audio_weight = Number(req.audioWeight.toFixed(2));
      if (req.personaId) input.persona_id = req.personaId;
      if (req.personaModel) input.persona_model = req.personaModel;
    } else {
      // In Non-custom Mode: only prompt and upload_url are allowed!
      input.prompt = (req.prompt || 'A fresh melodic cover').slice(0, 500);
      if (req.imageUrls?.length) input.image_urls = req.imageUrls.slice(0, 5);
    }

    return requestJson('/api/v1/jobs/createTask', {
      model: 'ai-music-api/upload-and-cover-audio',
      ...(callBackUrl ? { callBackUrl } : {}),
      input,
    });
  },

  mashup: (req: SunoMashupRequest) => {
    const isMock = shouldUseMockSuno();
    validateKieMashupRequest(req.uploadUrlList, isMock);
    validateAudioUrlForKie(req.uploadUrlList[0], 'Mashup Track 1', isMock);
    validateAudioUrlForKie(req.uploadUrlList[1], 'Mashup Track 2', isMock);
    validateWeightRange('audio_weight', req.audioWeight);
    validateWeightRange('style_weight', req.styleWeight);
    validateWeightRange('weirdness_constraint', req.weirdnessConstraint);

    const callBackUrl = req.callBackUrl || envFlag('VITE_SUNO_CALLBACK_URL', '');
    const model = req.model || 'V6_WILD';

    return requestJson('/api/v1/jobs/createTask', {
      model: 'ai-music-api/mashup',
      ...(callBackUrl ? { callBackUrl } : {}),
      input: {
        upload_url_list: req.uploadUrlList,
        custom_mode: req.customMode ?? true,
        model,
        prompt: (req.prompt || req.lyrics || 'A smooth seamless mashup blend').slice(0, 5000),
        style: (req.style || 'Electronic').slice(0, 1000),
        title: (req.title || 'Mashup Remix').slice(0, 100),
        instrumental: req.instrumental ?? false,
        ...(req.vocalGender ? { vocal_gender: req.vocalGender } : {}),
        ...(req.styleWeight != null ? { style_weight: req.styleWeight } : {}),
        ...(req.weirdnessConstraint != null ? { weirdness_constraint: req.weirdnessConstraint } : {}),
        ...(req.audioWeight != null ? { audio_weight: req.audioWeight } : {}),
      },
    });
  },

  addInstrumental: (req: KieAddInstrumentalRequest) => {
    validateAudioUrlForKie(req.uploadUrl, 'Add Instrumental Beat', shouldUseMockSuno());
    validateWeightRange('audio_weight', req.audioWeight);
    validateWeightRange('style_weight', req.styleWeight);
    validateWeightRange('weirdness_constraint', req.weirdnessConstraint);
    const callBackUrl = req.callBackUrl || envFlag('VITE_SUNO_CALLBACK_URL', '');

    return requestJson('/api/v1/jobs/createTask', {
      model: 'ai-music-api/add-instrumental',
      ...(callBackUrl ? { callBackUrl } : {}),
      input: {
        upload_url: req.uploadUrl,
        title: (req.title || 'Instrumental Beat').slice(0, 100),
        tags: (req.tags || 'trap beat, studio mix, punchy bass').slice(0, 1000),
        negative_tags: req.negativeTags ?? 'heavy metal, fast drums, noise, distorted',
        model: req.model ?? 'V6_WILD',
        ...(req.vocalGender ? { vocal_gender: req.vocalGender } : {}),
        ...(req.styleWeight != null ? { style_weight: req.styleWeight } : {}),
        ...(req.weirdnessConstraint != null ? { weirdness_constraint: req.weirdnessConstraint } : {}),
        ...(req.audioWeight != null ? { audio_weight: req.audioWeight } : {}),
        ...(req.personaId ? { persona_id: req.personaId } : {}),
      },
    });
  },

  separateVocals: (req: KieSeparateVocalsRequest) => {
    if (req.audioUrl) {
      validateAudioUrlForKie(req.audioUrl, 'Separate Vocals & Stems', shouldUseMockSuno());
    }
    const callBackUrl = req.callBackUrl || envFlag('VITE_SUNO_CALLBACK_URL', '');
    const input: Record<string, unknown> = {
      type: req.type || 'separate_vocal',
    };
    if (req.audioUrl) input.audio_url = req.audioUrl;
    if (req.taskId) input.task_id = req.taskId;
    if (req.audioId) input.audio_id = req.audioId;
    if (req.stemName) input.stem_name = req.stemName;

    return requestJson('/api/v1/jobs/createTask', {
      model: 'ai-music-api/separate-vocals',
      ...(callBackUrl ? { callBackUrl } : {}),
      input,
    });
  },

  getTimestampedLyrics: async (req: KieTimestampedLyricsRequest): Promise<KieTimestampedLyricsData> => {
    const base = resolveApiBase();
    const key = resolveApiKey();
    const callBackUrl = req.callBackUrl || envFlag('VITE_SUNO_CALLBACK_URL', '');

    let res: Response;
    try {
      res = await fetch(`${base}/api/v1/jobs/createTask`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'ai-music-api/timeStamped-lyrics',
          ...(callBackUrl ? { callBackUrl } : {}),
          input: {
            task_id: req.taskId,
            audio_id: req.audioId,
          },
        }),
      });
    } catch (networkError) {
      throw new AgentError(
        'KIE_NETWORK_CORS',
        `Timestamped lyrics bağlantı hatası: ${String(networkError)}`,
        true,
      );
    }

    if (!res.ok) {
      const text = await res.text();
      throw diagnoseKieError(res.status, text, '/api/v1/jobs/createTask (lyrics)', req);
    }

    const json = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: {
        alignedWords?: Array<{ word: string; startS: number; endS: number; success?: boolean; palign?: number }>;
        aligned_words?: Array<{ word: string; startS?: number; endS?: number; start_s?: number; end_s?: number; success?: boolean }>;
        waveformData?: number[];
        waveform_data?: number[];
        hootCer?: number;
        hoot_cer?: number;
        isStreamed?: boolean;
        is_streamed?: boolean;
      };
    };

    if (json.code && json.code !== 200) {
      throw diagnoseKieError(json.code, json.msg || 'Timestamped lyrics failed', 'timeStamped-lyrics', req);
    }

    const words = json.data?.alignedWords || json.data?.aligned_words || [];
    const normalizedWords: KieAlignedWord[] = words.map((w) => ({
      word: w.word,
      startS: w.startS ?? (w as unknown as { start_s?: number }).start_s ?? 0,
      endS: w.endS ?? (w as unknown as { end_s?: number }).end_s ?? 0,
      success: w.success ?? true,
    }));

    return {
      alignedWords: normalizedWords,
      waveformData: json.data?.waveformData || json.data?.waveform_data || [],
      hootCer: json.data?.hootCer || json.data?.hoot_cer,
      isStreamed: json.data?.isStreamed || json.data?.is_streamed,
    };
  },

  async poll(taskId: string) {
    const base = resolveApiBase();
    const key = resolveApiKey();

    const isKie = base.includes('kie.ai') || base.includes('/kie-api');
    const queryPath = isKie
      ? `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
      : `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`;

    let res: Response;
    try {
      res = await fetch(`${base}${queryPath}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
    } catch (networkError) {
      log.error('suno.poll-network-err', { taskId, error: String(networkError) });
      return { taskId, status: 'running' };
    }

    if (!res.ok && isKie) {
      try {
        res = await fetch(`${base}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
      } catch {
        // ignore fallback network error
      }
    }

    if (!res.ok) {
      throw diagnoseKieError(res.status, await res.text(), queryPath, { taskId });
    }

    const json = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: {
        status?: string;
        state?: string;
        response?: {
          data?: Array<{
            id?: string;
            audio_url?: string;
            audioUrl?: string;
            stream_audio_url?: string;
            streamAudioUrl?: string;
            image_url?: string;
            imageUrl?: string;
            title?: string;
            duration?: number;
            tags?: string;
          }>;
          sunoData?: Array<{ audioUrl?: string; audio_url?: string; title?: string }>;
        };
        resultJson?: string;
        result?: { audioUrl?: string; audio_url?: string; title?: string };
        audioUrl?: string;
        audio_url?: string;
      };
    };

    if (json.code && json.code !== 200) {
      throw diagnoseKieError(json.code, json.msg || 'Poll error', queryPath, { taskId });
    }

    const remote = (json.data?.status || json.data?.state || 'running').toLowerCase();

    // Kie.ai returns generated tracks under json.data.response.data or inside json.data.resultJson string
    let rawItems: Array<{
      id?: string;
      title?: string;
      audio_url?: string;
      audioUrl?: string;
      stream_audio_url?: string;
      streamAudioUrl?: string;
      image_url?: string;
      imageUrl?: string;
      duration?: number;
      tags?: string;
    }> = [];

    if (Array.isArray(json.data?.response?.data)) {
      rawItems = json.data.response.data;
    } else if (Array.isArray(json.data?.response?.sunoData)) {
      rawItems = json.data.response.sunoData;
    } else if (json.data?.resultJson) {
      try {
        const parsed = typeof json.data.resultJson === 'string' ? JSON.parse(json.data.resultJson) : json.data.resultJson;
        if (Array.isArray(parsed?.data)) rawItems = parsed.data;
      } catch {
        // ignore parse error
      }
    }

    const audioList = rawItems.map((item) => ({
      id: item.id,
      title: item.title,
      audioUrl: item.audio_url || item.audioUrl || item.stream_audio_url || item.streamAudioUrl,
      audio_url: item.audio_url || item.audioUrl,
      streamAudioUrl: item.stream_audio_url || item.streamAudioUrl,
      stream_audio_url: item.stream_audio_url || item.streamAudioUrl,
      imageUrl: item.image_url || item.imageUrl,
      image_url: item.image_url || item.imageUrl,
      duration: item.duration,
      tags: item.tags,
    }));

    const first = audioList[0];
    const audioUrl =
      first?.audioUrl ||
      first?.streamAudioUrl ||
      json.data?.result?.audioUrl ||
      json.data?.result?.audio_url ||
      json.data?.audioUrl ||
      json.data?.audio_url;
    const title = first?.title || json.data?.result?.title;

    const status =
      remote.includes('success') || remote === 'ready' || remote === 'complete'
        ? 'ready'
        : remote.includes('fail') || remote === 'error'
          ? 'failed'
          : 'running';

    return { taskId, status, audioUrl, title, audioList };
  },
};

export function getSunoClient(): SunoClientPort {
  return shouldUseMockSuno() ? mockSunoClient : liveSunoClient;
}
