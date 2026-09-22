import { useEffect, useMemo, useState } from 'react';
import {
  generateHarmonicBeatPrompt,
  HUMANIZER_PRESETS,
  listStyles,
  styleMessageKey,
  VOCAL_MAX_MS,
  type AudioClip,
  type VocalHumanizerOptions,
  type VocalHumanizerPreset,
} from '@agents';
import { IconBack, IconNote, IconPlay, IconPause, IconTrash, IconX } from '../ui/Icons';
import { LangSwitch } from '../ui/LangSwitch';
import { useI18n } from '../i18n/I18nProvider';

export type RecorderTake = {
  durationMs: number;
  mimeType: string;
  storagePath: string;
  peaks: number[];
};

export type VocalPhase = 'idle' | 'recording' | 'review' | 'compose';

function formatTimer(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function clipStamp(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function sampleBars(peaks: number[], count = 56) {
  if (peaks.length === 0) return Array.from({ length: count }, () => 0.55);
  const step = Math.max(1, Math.floor(peaks.length / count));
  return Array.from({ length: count }, (_, i) => {
    const slice = peaks.slice(i * step, i * step + step);
    const max = slice.reduce((m, n) => Math.max(m, n), 0.2);
    return Math.min(1, 0.42 + max * 0.58);
  });
}

export type VocalComposeMode = 'instrumental_beat' | 'cover_remix' | 'full_song';

export const AUTOTONE_PRESETS = [
  { id: 'human-natural', label: '✨ İnsansı Doğal (Nefes & Mikro-Timing)' },
  { id: 'vocal-doubles', label: '👥 Çift Vokal & Armoni (Lead + Double L/R)' },
  { id: 'silk-acoustic', label: '🌿 İpeksi Akustik (Formant & Tüp)' },
  { id: 'trap-autotune', label: '⚡ Trap Auto-Tune (T-Pain Snap)' },
  { id: 'warm-gold', label: '🎷 Sıcak R&B (Harmonik Doygunluk)' },
  { id: 'hyper-human', label: '🎙️ Ultra İnsansı (±8c Drift & Vibrato)' },
  { id: 'off', label: '⚪ Bypass (İşlemsiz Ham Ses)' },
] as const;

export function VocalScreen({
  live,
  peaks,
  elapsedMs,
  onPhase,
  onStart,
  onStop,
  onRestart,
  onSave,
  onCreate,
  onBack,
}: {
  live: boolean;
  peaks: number[];
  elapsedMs: number;
  onPhase: (phase: VocalPhase) => void;
  onStart: () => void;
  onStop: () => Promise<RecorderTake>;
  onRestart: () => void;
  onSave: (take: RecorderTake) => AudioClip;
  onCreate: (input: {
    prompt: string;
    lyrics: string;
    styleId: string;
    clip: AudioClip;
    mode: VocalComposeMode;
    autotone: string;
  }) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<VocalPhase>('idle');
  const [take, setTake] = useState<RecorderTake | null>(null);
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [composeMode, setComposeMode] = useState<VocalComposeMode>('instrumental_beat');
  const [autotone, setAutotone] = useState<string>('human-natural');
  const [showAutotone, setShowAutotone] = useState(false);
  const [humanizeOpts, setHumanizeOpts] = useState<VocalHumanizerOptions>(HUMANIZER_PRESETS['human-natural']);
  const [showLab, setShowLab] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [styleId, setStyleId] = useState('');
  const [showStyles, setShowStyles] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const styles = useMemo(() => listStyles(), []);
  const bars = sampleBars(phase === 'review' || phase === 'compose' ? (take?.peaks ?? peaks) : peaks);
  const timer = formatTimer(phase === 'review' || phase === 'compose' ? (take?.durationMs ?? elapsedMs) : elapsedMs);


  const go = (next: VocalPhase) => {
    setPhase(next);
    onPhase(next);
  };

  const finish = async () => {
    const next = await onStop();
    setTake(next);
    setClip(null);
    go('review');
  };

  useEffect(() => {
    onPhase(phase);
  }, [onPhase, phase]);

  useEffect(() => {
    if (phase === 'recording' && elapsedMs >= VOCAL_MAX_MS) {
      void finish();
    }
  }, [elapsedMs, phase]);

  const start = () => {
    setTake(null);
    setClip(null);
    go('recording');
    onStart();
  };

  const restart = () => {
    onRestart();
    setTake(null);
    setClip(null);
    setPlaying(false);
    go('idle');
  };

  const save = () => {
    if (!take) return;
    try {
      setClip(onSave(take));
    } catch {
      return;
    }
  };

  const nextStep = () => {
    if (!take) return;
    try {
      const stored = clip ?? onSave(take);
      setClip(stored);
      go('compose');
    } catch {
      return;
    }
  };

  if (phase === 'compose' && clip) {
    return (
      <section className="rec-page rec-page--compose" aria-label={t('vocal.region')}>
        <header className="rec-compose-top">
          <div>
            <p className="rec-mode">{t('vocal.modeSimple')}</p>
          </div>
          <LangSwitch />
        </header>

        <div className="rec-sheet">
          <div className="rec-sheet-inner">
            <div className="rec-clip">
              <button
                type="button"
                className="rec-clip-play"
                aria-label={playing ? t('library.pause') : t('vocal.playClip')}
                onClick={() => {
                  const audio = document.getElementById('vocal-take') as HTMLAudioElement | null;
                  if (!audio) return;
                  if (playing) {
                    audio.pause();
                    setPlaying(false);
                  } else {
                    void audio.play();
                    setPlaying(true);
                  }
                }}
              >
                {playing ? <IconPause size={12} /> : <IconPlay size={12} />}
              </button>
              <IconNote size={14} />
              <span>{clipStamp(clip.createdAt)}</span>
              <button type="button" className="rec-clip-x" aria-label={t('vocal.removeClip')} onClick={restart}>
                <IconX size={12} />
              </button>
              <audio id="vocal-take" src={clip.publicUrl ?? clip.storagePath} onEnded={() => setPlaying(false)} />
            </div>

            <div className="rec-chips" style={{ marginBottom: '10px' }}>
              <button
                type="button"
                className={`rec-chip${composeMode === 'instrumental_beat' ? ' is-on' : ''}`}
                onClick={() => setComposeMode('instrumental_beat')}
                title="Kie.ai Add Instrumental ile vokale beat üret"
              >
                🥁 Beat Üret
              </button>
              <button
                type="button"
                className={`rec-chip${composeMode === 'cover_remix' ? ' is-on' : ''}`}
                onClick={() => setComposeMode('cover_remix')}
                title="Kie.ai Upload & Cover ile remix üret"
              >
                🎛️ Remix / Cover
              </button>
              <button
                type="button"
                className={`rec-chip${composeMode === 'full_song' ? ' is-on' : ''}`}
                onClick={() => setComposeMode('full_song')}
                title="Kie.ai Generate ile tam parça üret"
              >
                🎵 Tam Parça
              </button>
            </div>

            <div className="rec-chips">
              <button
                type="button"
                className={`rec-chip${showAutotone ? ' is-on' : ''}`}
                onClick={() => setShowAutotone((v) => !v)}
              >
                🎙️ {AUTOTONE_PRESETS.find((p) => p.id === autotone)?.label || 'Auto-Tune'}
                <IconX size={10} />
              </button>
              <button
                type="button"
                className={`rec-chip${showStyles || styleId ? ' is-on' : ''}`}
                onClick={() => setShowStyles((v) => !v)}
              >
                {t('vocal.styles')}
                <IconX size={10} />
              </button>
              <button
                type="button"
                className={`rec-chip${showLyrics ? ' is-on' : ''}`}
                onClick={() => setShowLyrics((v) => !v)}
              >
                {t('vocal.lyrics')}
                <IconX size={10} />
              </button>
              <button
                type="button"
                className={`rec-chip${showLab ? ' is-on' : ''}`}
                onClick={() => setShowLab((v) => !v)}
              >
                🎛️ Ses Laboratuvarı
                <IconX size={10} />
              </button>
            </div>

            {showAutotone && (
              <div className="rec-style-row" style={{ marginTop: '8px' }}>
                {AUTOTONE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`rec-style${autotone === preset.id ? ' is-on' : ''}`}
                    onClick={() => {
                      setAutotone(preset.id);
                      const key = preset.id as VocalHumanizerPreset;
                      if (HUMANIZER_PRESETS[key]) {
                        setHumanizeOpts(HUMANIZER_PRESETS[key]);
                      }
                      setShowAutotone(false);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {showLab && (
              <div
                className="rec-lab-panel"
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '12px',
                  margin: '10px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>🎛️ İnsansı Vokal & DSP Ayarları</strong>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{autotone}</span>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>İnsansı Pitch Drift (± cents):</span>
                    <b>{humanizeOpts.pitchDriftCents} cent</b>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={humanizeOpts.pitchDriftCents}
                    onChange={(e) =>
                      setHumanizeOpts({ ...humanizeOpts, pitchDriftCents: parseFloat(e.target.value) })
                    }
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Çift Vokal & Stereo Genişlik (%):</span>
                    <b>{Math.round(humanizeOpts.doublerSpread * 100)}%</b>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={humanizeOpts.doublerSpread}
                    onChange={(e) =>
                      setHumanizeOpts({
                        ...humanizeOpts,
                        doublerSpread: parseFloat(e.target.value),
                        doublerEnabled: true,
                      })
                    }
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sıcak Lambalı Doygunluk (%):</span>
                    <b>{Math.round(humanizeOpts.warmSaturation * 100)}%</b>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={humanizeOpts.warmSaturation}
                    onChange={(e) =>
                      setHumanizeOpts({ ...humanizeOpts, warmSaturation: parseFloat(e.target.value) })
                    }
                  />
                </label>

                <button
                  type="button"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                  onClick={() => {
                    const harmonic = generateHarmonicBeatPrompt({
                      userPrompt: prompt,
                      vocalPeaks: clip?.waveform ? clip.waveform.map(Number) : undefined,
                      autotonePreset: autotone,
                    });
                    setPrompt(harmonic.prompt);
                  }}
                >
                  ✨ Sese Uygun Mükemmel Beat Promptu Üret
                </button>
              </div>
            )}

            {showStyles && (
              <div className="rec-style-row" style={{ marginTop: '8px' }}>
                {styles.map((style) => {
                  const key = styleMessageKey(style.id);
                  return (
                    <button
                      key={style.id}
                      type="button"
                      className={`rec-style${styleId === style.id ? ' is-on' : ''}`}
                      onClick={() => setStyleId((curr) => (curr === style.id ? '' : style.id))}
                    >
                      {key ? t(key) : style.label}
                    </button>
                  );
                })}
              </div>
            )}

            {showLyrics && (
              <textarea
                className="rec-lyrics"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder={t('create.lyricsPlaceholder')}
                aria-label={t('create.lyricsAria')}
              />
            )}

            <textarea
              className="rec-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                composeMode === 'instrumental_beat'
                  ? 'Beat tarzını girin (örn: Dark trap beat, 140 bpm, heavy 808 bass, piano melody...)'
                  : composeMode === 'cover_remix'
                    ? 'Remix promptunu girin (örn: Energetic drill remix, aggressive sliding 808...)'
                    : t('vocal.promptPlaceholder')
              }
              aria-label={t('create.promptAria')}
            />
          </div>
        </div>

        <div className="rec-compose-dock">
          <button type="button" className="rec-trash" aria-label={t('vocal.trash')} onClick={restart}>
            <IconTrash />
          </button>
          <button
            type="button"
            className="rec-make"
            disabled={busy}
            aria-label={t('vocal.makeAria')}
            onClick={() => {
              setBusy(true);
              onCreate({
                prompt,
                lyrics,
                styleId,
                clip: { ...clip, autotone },
                mode: composeMode,
                autotone,
              });
            }}
          >
            <IconNote size={18} />
            {composeMode === 'instrumental_beat'
              ? '🥁 Arkaya Beat Üret'
              : composeMode === 'cover_remix'
                ? '🎛️ Remix / Cover Üret'
                : t('vocal.make')}
          </button>
        </div>
      </section>

    );
  }

  return (
    <section className={`rec-page rec-page--focus rec-page--${phase}`} aria-label={t('vocal.region')}>
      <div className="rec-chrome">
        <button type="button" className="back-btn" aria-label={t('vocal.back')} onClick={phase === 'idle' ? onBack : restart}>
          <IconBack />
        </button>
        <LangSwitch />
      </div>

      <p className="rec-timer" aria-live="polite">
        {timer}
      </p>

      <div className="rec-stage">
        {phase === 'idle' ? (
          <div className="rec-rule" aria-hidden />
        ) : (
          <div className={`rec-wave${live ? ' is-live' : ''}`} aria-hidden>
            {bars.map((h, i) => (
              <i key={i} style={{ height: `${26 + h * 40}px` }} />
            ))}
          </div>
        )}
      </div>

      <div className="rec-dock">
        {phase === 'idle' && (
          <button type="button" className="rec-orb" aria-label={t('vocal.record')} onClick={start} />
        )}
        {phase === 'recording' && (
          <button type="button" className="rec-orb rec-orb--stop" aria-label={t('vocal.stop')} onClick={() => void finish()}>
            <span />
          </button>
        )}
        {phase === 'review' && (
          <div className="rec-actions">
            <button type="button" className="rec-pill" onClick={restart}>
              {t('vocal.restart')}
            </button>
            <button type="button" className={`rec-pill${clip ? ' is-saved' : ''}`} onClick={save} disabled={Boolean(clip)}>
              {clip ? t('vocal.saved') : t('vocal.save')}
            </button>
            <button type="button" className="rec-pill rec-pill--next" onClick={nextStep}>
              {t('vocal.next')}
            </button>
          </div>
        )}
        <p className="rec-limit">{t('vocal.limit')}</p>
      </div>
    </section>
  );
}
