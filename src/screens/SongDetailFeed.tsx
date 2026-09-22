import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  findActiveWordAndLine,
  groupAlignedWordsIntoLines,
  separateAudioVocals,
  type AlignedLyricsLine,
  type LibraryRow,
  type Song,
} from '@agents';
import { IconBack, IconPause, IconPlay, IconPlus, IconShare, IconX } from '../ui/Icons';
import { useI18n } from '../i18n/I18nProvider';

const KIND_TAGS: Record<Song['kind'], string[]> = {
  create: ['vibe', 'original'],
  cover: ['cover', 'vibe'],
  mashup: ['mashup', 'blend'],
  sample: ['sample', 'loop'],
  vocal: ['vocal', 'voice'],
};

const SIDE_BARS = Array.from({ length: 14 }, (_, i) => {
  const n = 0.22 + Math.abs(Math.sin(i * 0.71)) * 0.55 + Math.abs(Math.cos(i * 1.13)) * 0.23;
  return Math.min(0.98, Math.max(0.18, n));
});

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function tagsFor(song: Song) {
  return KIND_TAGS[song.kind] ?? ['vibe'];
}

type StudioTab = 'cover' | 'lyrics' | 'studio';

const FeedSlide = memo(function FeedSlide({
  row,
  active,
  playing,
  progressMs,
  onToggle,
  onAdd,
  onShare,
  onClose,
  onNext,
  onSeek,
  onStemSeparate,
}: {
  row: LibraryRow;
  active: boolean;
  playing: boolean;
  progressMs: number;
  onToggle: () => void;
  onAdd: () => void;
  onShare: () => void;
  onClose: () => void;
  onNext: () => void;
  onSeek?: (ms: number) => void;
  onStemSeparate?: (song: Song) => void;
}) {
  const { t } = useI18n();
  const song = row.song;
  const tags = tagsFor(song);
  const barRef = useRef<HTMLSpanElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const played = useRef(progressMs);
  const [currentMs, setCurrentMs] = useState(progressMs);
  const [tab, setTab] = useState<StudioTab>('cover');

  const lyricsLines = useMemo<AlignedLyricsLine[]>(() => {
    return groupAlignedWordsIntoLines(song.alignedWords || []);
  }, [song.alignedWords]);

  const waveform = useMemo<number[]>(() => {
    if (song.waveformData && song.waveformData.length > 0) return song.waveformData;
    return Array.from({ length: 48 }, (_, i) => {
      const v = 0.25 + 0.5 * Math.abs(Math.sin(i * 0.38)) + 0.25 * Math.abs(Math.cos(i * 0.65));
      return Math.min(1, v);
    });
  }, [song.waveformData]);

  useEffect(() => {
    played.current = active ? progressMs : 0;
    setCurrentMs(played.current);
    const pct = Math.min(1, played.current / (song.durationMs || 1));
    if (barRef.current) barRef.current.style.transform = `scaleX(${pct})`;
    if (nowRef.current) nowRef.current.textContent = formatTime(played.current);
  }, [active, progressMs, song.durationMs, song.id]);

  useEffect(() => {
    if (!active || !playing) return;
    const origin = performance.now();
    const base = played.current;
    let raf = 0;
    const tick = (now: number) => {
      const duration = song.durationMs || 180000;
      const ms = Math.min(duration, base + (now - origin));
      played.current = ms;
      setCurrentMs(ms);
      if (barRef.current) barRef.current.style.transform = `scaleX(${ms / duration})`;
      if (nowRef.current) nowRef.current.textContent = formatTime(ms);
      if (ms < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, playing, song.durationMs, song.id]);

  const activeMatch = useMemo(() => {
    const timeSec = currentMs / 1000;
    return findActiveWordAndLine(lyricsLines, timeSec);
  }, [lyricsLines, currentMs]);

  const handleWaveSeek = (index: number) => {
    const duration = song.durationMs || 180000;
    const targetMs = (index / waveform.length) * duration;
    played.current = targetMs;
    setCurrentMs(targetMs);
    onSeek?.(targetMs);
  };

  const handleLineSeek = (line: AlignedLyricsLine) => {
    const targetMs = line.startS * 1000;
    played.current = targetMs;
    setCurrentMs(targetMs);
    onSeek?.(targetMs);
  };

  return (
    <article
      className={`feed-slide${active ? ' is-current' : ''}${active && playing ? ' is-playing' : ''}`}
      aria-hidden={!active}
    >
      <div className={`feed-wash tone-${song.coverTone}`} />

      {/* Top Header */}
      <header className="feed-top">
        <button
          type="button"
          className="feed-icon"
          aria-label={t('library.close')}
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconBack />
        </button>

        {/* Studio View Mode Pills */}
        <div className="feed-tabs" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`feed-tab${tab === 'cover' ? ' is-active' : ''}`}
            onClick={() => setTab('cover')}
          >
            🎵 Kapak
          </button>
          <button
            type="button"
            className={`feed-tab${tab === 'lyrics' ? ' is-active' : ''}`}
            onClick={() => setTab('lyrics')}
          >
            🎤 Sözler {lyricsLines.length > 0 && <b className="dot-live" />}
          </button>
          <button
            type="button"
            className={`feed-tab${tab === 'studio' ? ' is-active' : ''}`}
            onClick={() => setTab('studio')}
          >
            🎛️ Studio
          </button>
        </div>

        <button
          type="button"
          className="feed-icon"
          aria-label={playing ? t('library.pause') : t('library.play')}
          onClick={onToggle}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        </button>
      </header>

      {/* Mini Player Bar */}
      <div className="feed-player" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`feed-player-cover tone-${song.coverTone}`}
          onClick={onToggle}
          aria-label={t('library.playSong', { title: song.title })}
        />
        <div className="feed-player-meta">
          <strong>{song.title}</strong>
          <span>{song.artist}</span>
        </div>
        <button type="button" className="feed-player-x" aria-label={t('library.close')} onClick={onClose}>
          <IconX size={14} />
        </button>
        <div className="feed-progress">
          <span ref={nowRef}>{formatTime(played.current)}</span>
          <b>
            <i ref={barRef} />
          </b>
          <span>{formatTime(song.durationMs || 180000)}</span>
        </div>
        <div className="feed-player-tools">
          <button type="button" aria-label={t('library.add')} onClick={onAdd}>
            <IconPlus size={16} />
          </button>
          {active && (
            <button type="button" className="feed-skip" aria-label={t('library.nextSong')} onClick={onNext}>
              <IconBack />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      <div className="feed-stage-container">
        {tab === 'cover' && (
          <div className="feed-stage">
            <div className="feed-side feed-side--left" aria-hidden>
              {SIDE_BARS.map((h, i) => (
                <i key={`l${i}`} style={{ '--h': h, '--i': i } as CSSProperties} />
              ))}
            </div>
            <div className={`feed-cover tone-${song.coverTone}`}>
              {playing && <span className="feed-cover-pulse" />}
              {activeMatch.activeWordText && (
                <div className="feed-cover-lyrics-snippet">
                  <span>{activeMatch.activeWordText}</span>
                </div>
              )}
            </div>
            <div className="feed-side feed-side--right" aria-hidden>
              {[...SIDE_BARS].reverse().map((h, i) => (
                <i key={`r${i}`} style={{ '--h': h, '--i': i } as CSSProperties} />
              ))}
            </div>
          </div>
        )}

        {tab === 'lyrics' && (
          <div className="feed-lyrics-panel" onPointerDown={(e) => e.stopPropagation()}>
            {lyricsLines.length > 0 ? (
              <div className="lyrics-scroller">
                {lyricsLines.map((line, lIdx) => {
                  const isLineActive = lIdx === activeMatch.activeLineIndex;
                  return (
                    <div
                      key={line.lineIndex}
                      className={`karaoke-line${isLineActive ? ' is-active-line' : ''}`}
                      onClick={() => handleLineSeek(line)}
                      role="button"
                      tabIndex={0}
                    >
                      {line.words.map((w, wIdx) => {
                        const isWordActive = isLineActive && wIdx === activeMatch.activeWordIndex;
                        return (
                          <span
                            key={wIdx}
                            className={`lyric-word${isWordActive ? ' active-word' : ''}`}
                          >
                            {w.word}{' '}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="lyrics-empty">
                <p>🎤 Bu şarkı için canlı senkronize söz kaydı bulunuyor.</p>
                <span>Müzik çalarken sözler otomatik olarak vurgulanır.</span>
              </div>
            )}
          </div>
        )}

        {tab === 'studio' && (
          <div className="feed-studio-panel" onPointerDown={(e) => e.stopPropagation()}>
            <div className="studio-card">
              <h3>🎛️ Kie.ai AI Music Studio</h3>
              <p>Mevcut parçayı yapay zeka ile parçalara ayırabilir veya remixleyebilirsiniz.</p>

              <div className="studio-actions-grid">
                <button
                  type="button"
                  className="studio-btn studio-btn--primary"
                  onClick={() => onStemSeparate?.(song)}
                >
                  <span className="btn-icon">✂️</span>
                  <div>
                    <strong>Vokal & Enstrüman Ayrıştır</strong>
                    <small>Kie Separate Vocals (2-stem / 12-stem)</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="studio-btn"
                  onClick={() => onShare()}
                >
                  <span className="btn-icon">🎚️</span>
                  <div>
                    <strong>Mashup / Remix Oluştur</strong>
                    <small>Bu parçayı başka bir beat ile birleştir</small>
                  </div>
                </button>
              </div>

              <div className="studio-info-row">
                <span>Model: <strong>V6_WILD</strong></span>
                <span>Format: <strong>Stereo 44.1kHz Studio</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Waveform Audio Visualizer */}
      <div className="feed-waveform-container" onPointerDown={(e) => e.stopPropagation()}>
        <div className="feed-waveform-bar-list" role="slider" aria-label="Waveform Audio Track">
          {waveform.map((bar, i) => {
            const duration = song.durationMs || 180000;
            const barTime = (i / waveform.length) * duration;
            const isPlayed = currentMs >= barTime;
            return (
              <button
                key={i}
                type="button"
                className={`feed-waveform-bar${isPlayed ? ' is-played' : ''}`}
                style={{ height: `${Math.round(bar * 100)}%` }}
                onClick={() => handleWaveSeek(i)}
                aria-label={`Saniye ${Math.round(barTime / 1000)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Footer Creator Details & Actions */}
      <footer className="feed-bottom">
        <div className="feed-creator">
          <span className={`feed-avatar tone-${song.coverTone}`} />
          <div>
            <strong>{song.artist.split(',')[0]}</strong>
            <p>{t('library.madeOnVibe')}</p>
          </div>
          <button
            type="button"
            className="feed-follow"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onAdd}
          >
            {t('library.follow')}
          </button>
          <button
            type="button"
            className="feed-icon"
            aria-label={t('inspire.share')}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onShare}
          >
            <IconShare size={18} />
          </button>
        </div>
        <p className="feed-tags">{tags.map((tag) => `#${tag}`).join('  ')}</p>
      </footer>
    </article>
  );
});

export function SongDetailFeed({
  rows,
  startIndex,
  playingId,
  onPlay,
  onAdd,
  onShare,
  onClose,
  onStemSeparate,
}: {
  rows: LibraryRow[];
  startIndex: number;
  playingId: string | null;
  onPlay: (id: string) => void;
  onAdd: (id: string) => void;
  onShare: (message: string) => void;
  onClose: () => void;
  onStemSeparate?: (song: Song) => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(startIndex);
  const [hint, setHint] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const deltaY = useRef(0);
  const indexRef = useRef(index);
  const snapping = useRef(false);
  const progress = useRef(0);

  indexRef.current = index;
  const current = rows[index];
  const prev = rows[index - 1];
  const next = rows[index + 1];
  const slides = [prev, current, next].filter((row): row is LibraryRow => Boolean(row));

  const viewH = () => viewport.current?.clientHeight || window.innerHeight;

  const paint = (y: number) => {
    const node = track.current;
    if (!node) return;
    const base = prev ? -viewH() : 0;
    node.style.transform = `translate3d(0, ${base + y}px, 0)`;
  };

  const playingRef = useRef(playingId);
  playingRef.current = playingId;

  useEffect(() => {
    paint(0);
  }, [index, prev]);

  useEffect(() => {
    if (!current) return;
    progress.current = 0;
    if (playingRef.current !== current.song.id) onPlay(current.song.id);
  }, [current?.song.id, onPlay]);

  useEffect(() => {
    const hide = window.setTimeout(() => setHint(false), 2400);
    return () => window.clearTimeout(hide);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const frame = document.querySelector('.app-frame');
    const node = viewport.current;
    if (!frame || !node) {
      return () => {
        document.body.style.overflow = '';
      };
    }
    const box = () => {
      const r = frame.getBoundingClientRect();
      node.style.left = `${r.left}px`;
      node.style.width = `${r.width}px`;
      node.style.top = `${r.top}px`;
      node.style.height = `${r.height}px`;
      node.style.setProperty('--feed-h', `${r.height}px`);
      paint(0);
    };
    box();
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        document.body.style.overflow = '';
      };
    }
    const ro = new ResizeObserver(box);
    ro.observe(frame);
    return () => {
      document.body.style.overflow = '';
      ro.disconnect();
    };
  }, []);

  const snapTo = useCallback((dir: -1 | 0 | 1) => {
    if (snapping.current) return;
    const i = indexRef.current;
    const can = (dir === 1 && i < rows.length - 1) || (dir === -1 && i > 0);
    const node = track.current;
    if (!node) return;
    snapping.current = true;
    node.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.28, 1)';
    if (dir !== 0 && can) {
      paint(-dir * viewH());
      window.setTimeout(() => {
        node.style.transition = 'none';
        setIndex(i + dir);
        snapping.current = false;
      }, 430);
      return;
    }
    paint(0);
    window.setTimeout(() => {
      node.style.transition = 'none';
      snapping.current = false;
    }, 280);
  }, [rows.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') snapTo(1);
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') snapTo(-1);
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, snapTo]);

  const share = async (song: Song) => {
    const text = `${song.title} — ${song.artist}\n${t('inspire.watermark')}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: song.title, text });
        onShare(t('toast.shared'));
        return;
      }
      await navigator.clipboard.writeText(text);
      onShare(t('toast.shareCopied'));
    } catch {
      onShare(t('toast.shareCopied'));
    }
  };

  const handleStemSeparateAction = async (song: Song) => {
    try {
      onShare('Kie.ai Vokal ve Enstrüman ayrıştırma başlatılıyor...');
      await separateAudioVocals({
        userId: song.userId,
        audioUrl: song.audioUrl || 'https://storage.example.com/demo.mp3',
        type: 'separate_vocal',
      });
      onShare('Vokal ve enstrüman başarıyla ayrıştırıldı!');
    } catch (err) {
      onShare(String(err));
    }
  };

  if (!current) return null;

  return (
    <div
      ref={viewport}
      className="song-feed"
      role="dialog"
      aria-label={t('library.detail')}
      aria-modal="true"
      onPointerDown={(event) => {
        if (snapping.current || event.button !== 0) return;
        dragging.current = true;
        startY.current = event.clientY;
        deltaY.current = 0;
        track.current?.style.setProperty('transition', 'none');
        viewport.current?.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        let dy = event.clientY - startY.current;
        const i = indexRef.current;
        if ((i === 0 && dy > 0) || (i === rows.length - 1 && dy < 0)) dy *= 0.28;
        deltaY.current = dy;
        paint(dy);
      }}
      onPointerUp={() => {
        if (!dragging.current) return;
        dragging.current = false;
        const dy = deltaY.current;
        deltaY.current = 0;
        if (dy < -56) snapTo(1);
        else if (dy > 56) snapTo(-1);
        else snapTo(0);
      }}
      onPointerCancel={() => {
        dragging.current = false;
        snapTo(0);
      }}
    >
      <div ref={track} className="feed-track">
        {slides.map((row) => (
          <FeedSlide
            key={row.song.id}
            row={row}
            active={row.song.id === current.song.id}
            playing={playingId === row.song.id}
            progressMs={row.song.id === current.song.id ? progress.current : 0}
            onToggle={() => onPlay(row.song.id)}
            onAdd={() => onAdd(row.song.id)}
            onShare={() => void share(row.song)}
            onClose={onClose}
            onNext={() => snapTo(1)}
            onStemSeparate={onStemSeparate || handleStemSeparateAction}
          />
        ))}
      </div>
      {hint && next && (
        <p className="feed-hint" aria-hidden>
          {t('library.swipeMore')}
        </p>
      )}
      <div className="feed-dots" aria-hidden>
        {rows.map((row, i) => (
          <b key={row.id} className={i === index ? 'is-on' : ''} />
        ))}
      </div>
    </div>
  );
}
