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
    <div className={`story-wave-box story-wave-box--minimal story-wave-box--${variant}${active ? ' is-live' : ''}`} aria-label={label}>
      {/* Pure, Minimalist Audio Spectrum (No boxes, no grids, no clutter) */}
      <div className="story-wave-canvas" aria-hidden>
        {variant === 'orbit' ? (
          <MinimalOrbit levels={levels} active={active} />
        ) : variant === 'pulse' ? (
          <MinimalPulse levels={levels} active={active} />
        ) : (
          <MinimalSpectrum levels={levels} active={active} />
        )}
      </div>

      {/* Clean, Frameless Typography */}
      {(caption || sub) && (
        <div className="story-wave-meta">
          {caption ? <strong className="story-wave-title">{caption}</strong> : null}
          {sub ? <p className="story-wave-sub">{sub}</p> : null}
        </div>
      )}
    </div>
  );
}

// Minimal, elegant 38-bar audio spectrum with glowing gradient
function MinimalSpectrum({ levels, active }: { levels: number[]; active: boolean }) {
  const barCount = 38;
  const w = 280;
  const h = 88;
  const mid = h / 2;
  const gap = 3.2;
  const barW = (w - gap * (barCount + 1)) / barCount;

  return (
    <svg className="story-wave-svg story-wave-svg--minimal" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <linearGradient id="spectrum-clean-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="35%" stopColor="#818cf8" />
          <stop offset="70%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>

      {Array.from({ length: barCount }, (_, i) => {
        const norm = i / (barCount - 1);
        // Smooth organic acoustic curve
        const bell = Math.exp(-Math.pow((norm - 0.5) / 0.28, 2));
        const dynamicLevel = levels[i % levels.length] ?? 0.5;
        const amp = 0.22 + bell * (active ? 0.72 : 0.58) + (active ? dynamicLevel * 0.18 : Math.sin(i * 0.7) * 0.06);
        const bh = Math.max(6, Math.min(h - 6, amp * (h - 8)));
        const x = gap + i * (barW + gap);
        const y = mid - bh / 2;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={bh}
            rx={barW / 2}
            fill="url(#spectrum-clean-grad)"
            opacity={0.72 + amp * 0.28}
          />
        );
      })}
    </svg>
  );
}

// Minimal Orbit
function MinimalOrbit({ levels, active }: { levels: number[]; active: boolean }) {
  const cx = 120;
  const cy = 120;
  const inner = 42;
  return (
    <svg className="story-wave-svg story-wave-svg--minimal" viewBox="0 0 240 240" aria-hidden>
      <defs>
        <linearGradient id="orbit-clean-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r="38" fill="rgba(168, 85, 247, 0.12)" />
      {levels.map((amp, i) => {
        const angle = (i / levels.length) * Math.PI * 2 - Math.PI / 2;
        const len = 6 + amp * (active ? 36 : 18);
        return (
          <line
            key={i}
            x1={cx + Math.cos(angle) * inner}
            y1={cy + Math.sin(angle) * inner}
            x2={cx + Math.cos(angle) * (inner + len)}
            y2={cy + Math.sin(angle) * (inner + len)}
            stroke="url(#orbit-clean-grad)"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity={0.6 + amp * 0.4}
          />
        );
      })}
    </svg>
  );
}

// Minimal Pulse
function MinimalPulse({ levels, active }: { levels: number[]; active: boolean }) {
  const bass = (levels[0] + levels[1] + levels[2] + levels[3]) / 4;
  const rings = [0.32, 0.55, 0.78];
  return (
    <svg className="story-wave-svg story-wave-svg--minimal" viewBox="0 0 240 240" aria-hidden>
      <defs>
        <radialGradient id="pulse-clean-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r={18 + bass * 20} fill="url(#pulse-clean-grad)" />
      {rings.map((factor, i) => (
        <circle
          key={i}
          cx="120"
          cy="120"
          r={34 + i * 24 + bass * 18}
          fill="none"
          stroke={i % 2 === 0 ? '#38bdf8' : '#a855f7'}
          strokeWidth="2"
          opacity={0.3 + bass * 0.45 - i * 0.08}
        />
      ))}
    </svg>
  );
}
