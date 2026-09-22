type RhythmVariant = 'orbit' | 'eq' | 'wave' | 'pulse';

type StoryRhythmProps = {
  levels: number[];
  active: boolean;
  variant: RhythmVariant;
  label: string;
  caption?: string;
  sub?: string;
};

export function StoryRhythm({ levels, active, variant, label, caption, sub }: StoryRhythmProps) {
  return (
    <div className={`story-wave-box story-wave-box--${variant}${active ? ' is-live' : ''}`} aria-label={label}>
      {variant === 'orbit' ? <Orbit levels={levels} active={active} /> : null}
      {variant === 'eq' ? <Eq levels={levels} active={active} /> : null}
      {variant === 'wave' ? <Wave levels={levels} active={active} /> : null}
      {variant === 'pulse' ? <Pulse levels={levels} active={active} /> : null}
      {(caption || sub) && (
        <div className="story-wave-meta">
          {caption ? <strong>{caption}</strong> : null}
          {sub ? <span>{sub}</span> : null}
        </div>
      )}
    </div>
  );
}

function Orbit({ levels, active }: { levels: number[]; active: boolean }) {
  const cx = 120;
  const cy = 120;
  const inner = 52;
  return (
    <svg className="story-wave-svg" viewBox="0 0 240 240" aria-hidden>
      <circle cx={cx} cy={cy} r="44" fill={active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'} />
      {levels.map((amp, i) => {
        const angle = (i / levels.length) * Math.PI * 2 - Math.PI / 2;
        const len = 8 + amp * (active ? 38 : 16);
        return (
          <line
            key={i}
            x1={cx + Math.cos(angle) * inner}
            y1={cy + Math.sin(angle) * inner}
            x2={cx + Math.cos(angle) * (inner + len)}
            y2={cy + Math.sin(angle) * (inner + len)}
            stroke="currentColor"
            strokeWidth={active ? 3.1 : 2.3}
            strokeLinecap="round"
            opacity={0.55 + amp * 0.45}
          />
        );
      })}
    </svg>
  );
}

function Eq({ levels, active }: { levels: number[]; active: boolean }) {
  const bars = levels.filter((_, i) => i % 2 === 0).slice(0, 18);
  const w = 240;
  const h = 140;
  const gap = 4;
  const barW = (w - gap * (bars.length + 1)) / bars.length;
  return (
    <svg className="story-wave-svg" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {bars.map((amp, i) => {
        const bh = Math.max(12, amp * (active ? h - 12 : h * 0.55));
        const x = gap + i * (barW + gap);
        const y = (h - bh) / 2;
        return <rect key={i} x={x} y={y} width={barW} height={bh} rx={barW / 2} fill="currentColor" opacity={0.42 + amp * 0.58} />;
      })}
    </svg>
  );
}

function Wave({ levels, active }: { levels: number[]; active: boolean }) {
  const w = 280;
  const h = 152;
  const mid = h / 2;
  const n = levels.length;
  const step = w / n;
  return (
    <svg className="story-wave-svg" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {levels.map((amp, i) => {
        const bh = Math.max(6, amp * (active ? 128 : 52));
        return (
          <rect
            key={i}
            x={i * step + step * 0.22}
            y={mid - bh / 2}
            width={Math.max(2, step * 0.56)}
            height={bh}
            rx="2"
            fill="currentColor"
            opacity={0.4 + amp * 0.6}
          />
        );
      })}
    </svg>
  );
}

function Pulse({ levels, active }: { levels: number[]; active: boolean }) {
  const bass = (levels[0] + levels[1] + levels[2] + levels[3]) / 4;
  const rings = [0.28, 0.46, 0.64, 0.82];
  return (
    <svg className="story-wave-svg" viewBox="0 0 240 240" aria-hidden>
      <circle cx="120" cy="120" r={18 + bass * 22} fill="currentColor" opacity="0.9" />
      {rings.map((_, i) => (
        <circle
          key={i}
          cx="120"
          cy="120"
          r={36 + i * 22 + bass * 18}
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 3 : 2}
          opacity={0.18 + bass * 0.45 - i * 0.04}
        />
      ))}
    </svg>
  );
}
