import type { LyricFrame, LyricTrack } from '@agents';

type StoryLyricsProps = {
  frame: LyricFrame;
  track: LyricTrack | null;
  liveLabel: string;
  emptyLabel: string;
  fallbackLabel: string;
  syncedLabel: string;
  tone?: 'light' | 'dark';
};

export function StoryLyrics({
  frame,
  track,
  liveLabel,
  emptyLabel,
  tone = 'dark',
}: StoryLyricsProps) {
  const current = frame.current || frame.prev || frame.next || '\u00a0';
  const prev = frame.prev && frame.prev !== current ? frame.prev : '';
  const next = frame.next && frame.next !== current ? frame.next : '';

  return (
    <div className={`story-lyric-box story-lyric-box--${tone}${track ? ' is-live' : ''}`} aria-live="polite" aria-label={liveLabel}>
      <div className="story-lyric-panel">
        {track ? (
          <>
            {prev ? <p className="story-lyric is-prev">{prev}</p> : null}
            <p className="story-lyric is-now">
              <span style={{ ['--lyric-p' as string]: String(frame.progress) }}>{current}</span>
            </p>
            {next ? <p className="story-lyric is-next">{next}</p> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
