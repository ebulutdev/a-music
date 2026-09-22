type StoryMusicStickerProps = {
  title: string;
  artist: string;
  levels: number[];
  playing: boolean;
  currentSec: number;
  durationSec: number;
  stopLabel: string;
  onStop: () => void;
};

function coverLetters(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function StoryMusicSticker({
  title,
  artist,
  levels,
  playing,
  currentSec,
  durationSec,
  stopLabel,
  onStop,
}: StoryMusicStickerProps) {
  const progress = durationSec > 0 ? Math.min(1, currentSec / durationSec) : 0;
  const bars = Array.from({ length: 48 }, (_, i) => {
    const src = levels[i % levels.length] ?? 0.2;
    const travel = (i / 48 + progress) % 1;
    return Math.min(1, src * (0.5 + 0.75 * Math.sin(travel * Math.PI)));
  });

  return (
    <div
      className={`story-sticker${playing ? ' is-playing' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div className="story-sticker-cover" aria-hidden>
        {coverLetters(title)}
      </div>
      <h3 className="story-sticker-title">{title}</h3>
      <p className="story-sticker-artist">{artist}</p>

      <div className="story-sticker-controls">
        <span className="story-sticker-chip">30</span>
        <div className="story-sticker-slider">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <button type="button" className="story-sticker-stop" onClick={onStop} aria-label={stopLabel}>
          <span className="story-sticker-square" />
        </button>
      </div>

      <div className="story-sticker-wave" aria-hidden>
        {bars.map((amp, i) => (
          <b key={i} style={{ height: `${8 + amp * 22}px` }} />
        ))}
      </div>
    </div>
  );
}
