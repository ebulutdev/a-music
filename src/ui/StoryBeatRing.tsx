type StoryBeatRingProps = {
  levels: number[];
  active: boolean;
};

export function StoryBeatRing({ levels, active }: StoryBeatRingProps) {
  const cx = 105;
  const cy = 105;
  const inner = 90;
  return (
    <svg className={`story-beat-ring${active ? ' is-live' : ''}`} viewBox="0 0 210 210" aria-hidden>
      {levels.map((amp, i) => {
        const angle = (i / levels.length) * Math.PI * 2 - Math.PI / 2;
        const len = 10 + amp * (active ? 32 : 14);
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * (inner + len);
        const y2 = cy + Math.sin(angle) * (inner + len);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={amp > 0.62 ? '#fff6c2' : '#ffe14d'}
            strokeWidth={active ? 3.2 : 2.4}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
