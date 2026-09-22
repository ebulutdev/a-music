import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { LibraryRow } from '@agents';
import { FIREBASE_SEED_IDS } from '@db/firebase-collections';
import { IconBack, IconNote } from '../ui/Icons';
import { LangSwitch } from '../ui/LangSwitch';
import { StoryBeatRing } from '../ui/StoryBeatRing';
import { StoryLyrics } from '../ui/StoryLyrics';
import { StoryMusicSticker } from '../ui/StoryMusicSticker';
import { StoryRhythm } from '../ui/StoryRhythm';
import { useI18n } from '../i18n/I18nProvider';
import { useStoryKaraoke } from '../hooks/useStoryKaraoke';

const WASHES = [
  'purple',
  'track-table',
  'track-night',
  'track-car',
  'track-portrait',
  'track-create',
  'studio',
  'pink',
  'invite',
] as const;

const TRACK_TONES = new Set(['table', 'night', 'car', 'portrait', 'create']);

function stageFor(index: number, coverTone?: string) {
  if (index === 0) return 'purple';
  if (index === 1) {
    const tone = coverTone && TRACK_TONES.has(coverTone) ? coverTone : 'table';
    return `track-${tone}`;
  }
  if (index === 2) return 'studio';
  if (index === 3) return 'pink';
  return 'invite';
}

function StoryFrame({
  tone,
  children,
}: {
  tone: string;
  children: ReactNode;
}) {
  return (
    <div className="story-stage">
      <div className={`story-card story-split ${tone}`}>{children}</div>
    </div>
  );
}

export function InspireScreen({
  library,
  vocalCount,
  beatCount,
}: {
  library: LibraryRow[];
  vocalCount: number;
  beatCount: number;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const picker = useRef<HTMLInputElement>(null);
  const featured = library[0]?.song;
  const cards = 5;
  const stage = stageFor(index, featured?.coverTone);
  const karaoke = useStoryKaraoke(FIREBASE_SEED_IDS.users.localDev);

  const lyrics = {
    frame: karaoke.frame,
    track: karaoke.track,
    liveLabel: t('inspire.lyricsLive'),
    emptyLabel: t('inspire.pickMusic'),
    fallbackLabel: t('inspire.lyricsFallback'),
    syncedLabel: t('inspire.lyricsSynced'),
  };

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(cards - 1, next)));
    },
    [cards],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(index + 1);
      if (event.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  const togglePlay = () => {
    if (karaoke.track) void karaoke.toggle();
    else picker.current?.click();
  };

  const musicCard = () =>
    karaoke.track ? (
      <StoryMusicSticker
        title={karaoke.track.title}
        artist={karaoke.track.artist}
        levels={karaoke.levels}
        playing={karaoke.playing}
        currentSec={karaoke.currentSec}
        durationSec={karaoke.durationSec}
        stopLabel={t('inspire.stopClip')}
        onStop={() => karaoke.pause()}
      />
    ) : null;

  return (
    <section className={`inspire inspire--${stage}`} aria-label={t('inspire.stories')}>
      {WASHES.map((id) => (
        <div key={id} className={`inspire-wash inspire-wash--${id}${stage === id ? ' is-on' : ''}`} aria-hidden />
      ))}
      <div className="lang-dock lang-dock--on-color">
        <LangSwitch />
      </div>

      <div
        className="inspire-viewport"
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const dx = event.clientX - startX.current;
          if (dx < -48) go(index + 1);
          if (dx > 48) go(index - 1);
        }}
      >
        <div className="inspire-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          <article className="inspire-slide">
            <StoryFrame tone="phone--purple">
              <p className="story-brand" lang="en">{t('brand.name')}</p>
              <StoryLyrics {...lyrics} />
              {musicCard() ?? (
                <button
                  type="button"
                  className={`story-beat${karaoke.playing ? ' is-playing' : ''}`}
                  onClick={togglePlay}
                  aria-label={t('inspire.pickMusicAria')}
                >
                  <StoryBeatRing levels={karaoke.levels} active={karaoke.playing} />
                  <span className="burst">
                    {t('inspire.year')}
                    <br />
                    {t('inspire.wrapped')}
                  </span>
                </button>
              )}
              <p className="story-mark" lang="en">{t('inspire.watermark')}</p>
            </StoryFrame>
          </article>

          <article className="inspire-slide">
            <StoryFrame tone="phone--black">
              <p className="story-brand" lang="en">{t('brand.name')}</p>
              <StoryLyrics {...lyrics} />
              {musicCard() ?? (
                <button type="button" className="story-wave-hit" onClick={togglePlay}>
                  <StoryRhythm
                    variant="wave"
                    levels={karaoke.levels}
                    active={karaoke.playing}
                    label={t('inspire.rhythmAria')}
                    caption={featured?.title}
                    sub={featured?.artist}
                  />
                </button>
              )}
              <p className="story-mark" lang="en">{t('inspire.watermark')}</p>
            </StoryFrame>
          </article>

          <article className="inspire-slide">
            <StoryFrame tone="phone--studio">
              <p className="story-brand" lang="en">{t('brand.name')}</p>
              <StoryLyrics {...lyrics} />
              {musicCard() ?? (
                <button type="button" className="story-wave-hit" onClick={togglePlay}>
                  <StoryRhythm
                    variant="eq"
                    levels={karaoke.levels}
                    active={karaoke.playing}
                    label={t('inspire.rhythmAria')}
                    caption={t('inspire.studioStat', { vocals: vocalCount, beats: beatCount })}
                    sub={t('inspire.studioCopy')}
                  />
                </button>
              )}
              <p className="story-mark" lang="en">{t('inspire.watermark')}</p>
            </StoryFrame>
          </article>

          <article className="inspire-slide">
            <StoryFrame tone="phone--pink">
              <p className="story-brand" lang="en">{t('brand.name')}</p>
              <StoryLyrics {...lyrics} tone="light" />
              {musicCard() ?? (
                <button type="button" className="story-wave-hit" onClick={togglePlay}>
                  <StoryRhythm
                    variant="orbit"
                    levels={karaoke.levels}
                    active={karaoke.playing}
                    label={t('inspire.rhythmAria')}
                  />
                </button>
              )}
              <p className="story-mark" lang="en">{t('inspire.watermark')}</p>
            </StoryFrame>
          </article>

          <article className="inspire-slide">
            <StoryFrame tone="phone--invite">
              <p className="story-brand" lang="en">{t('brand.name')}</p>
              <StoryLyrics {...lyrics} />
              {musicCard() ?? (
                <button type="button" className="story-wave-hit" onClick={togglePlay}>
                  <StoryRhythm
                    variant="pulse"
                    levels={karaoke.levels}
                    active={karaoke.playing}
                    label={t('inspire.rhythmAria')}
                    caption={t('inspire.inviteTitle')}
                  />
                </button>
              )}
              <p className="story-mark" lang="en">{t('inspire.watermark')}</p>
            </StoryFrame>
          </article>
        </div>
      </div>

      <div className="inspire-dock">
        <div className="inspire-controls">
          <button type="button" className="story-nav" aria-label={t('inspire.prev')} disabled={index === 0} onClick={() => go(index - 1)}>
            <IconBack />
          </button>
          <div className="inspire-dots" role="tablist" aria-label={t('inspire.stories')}>
            {Array.from({ length: cards }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`inspire-dot${i === index ? ' is-on' : ''}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="story-nav story-nav--next"
            aria-label={t('inspire.next')}
            disabled={index === cards - 1}
            onClick={() => go(index + 1)}
          >
            <IconBack />
          </button>
        </div>
        <input
          ref={picker}
          type="file"
          accept="audio/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            void karaoke.loadFile(file);
          }}
        />
        <button
          type="button"
          className="story-share"
          onClick={() => picker.current?.click()}
          disabled={karaoke.busy}
          aria-label={t('inspire.pickMusicAria')}
        >
          <IconNote size={16} />
          {karaoke.track ? t('inspire.changeMusic') : t('inspire.pickMusic')}
        </button>
      </div>
    </section>
  );
}
