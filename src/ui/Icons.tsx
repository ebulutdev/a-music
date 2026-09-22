type IconProps = { size?: number; className?: string };

export function IconMenu({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBack({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5 7 12l8 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGift({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10v10M4 14h16M12 10c0-3 2.4-5 4.2-5 1.4 0 2.3 1.2 1.6 2.6C16.8 9.4 13.6 10 12 10ZM12 10c0-3-2.4-5-4.2-5-1.4 0-2.3 1.2-1.6 2.6C7.2 9.4 10.4 10 12 10Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconBrand({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size * 0.64} viewBox="0 0 28 18" fill="none" aria-hidden>
      <path d="M9 9a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 4.2 3M19 9a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0-4.2-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconHome({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconSpark({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2l1.1 6.4L19.6 10 13.1 11.4 12 21.8l-1.1-10.4L4.4 10l6.5-1.4L12 2.2Z" />
    </svg>
  );
}

export function IconGrid({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconFolder({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3.8 8.5V7A2 2 0 0 1 5.8 5h4.2l1.6 2H18a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H6a2.2 2.2 0 0 1-2.2-2.2V8.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconInspire({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v3M12 18v3M4.5 7.2l2.2 1.3M17.3 15.5l2.2 1.3M4.5 16.8l2.2-1.3M17.3 8.5l2.2-1.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconMic({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 11a5 5 0 0 0 10 0M12 16v4M9 20h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconShare({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 10.8 15.6 6.4M8.2 13.2l7.4 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconSend({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.2-5.5M20 5v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlay({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.8v12.4L19 12 8 5.8Z" />
    </svg>
  );
}

export function IconPause({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="5" width="3.4" height="14" rx="1" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1" />
    </svg>
  );
}

export function IconX({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWave({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M4 16h3l2-6 3 12 3-16 3 16 3-10 2 4h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShuffle({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h4l3 5M4 17h4l2-3M16 7h4m-4 10h4M16 7l-3 5 3 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconNote({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 18V6l10-2v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="16" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
