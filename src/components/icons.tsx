import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size?: number) => ({
  width: size ?? 16,
  height: size ?? 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconCrown = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 18h18l-1.5-9.5L15 12l-3-7-3 7-4.5-3.5L3 18Z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSoundOn = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none" />
    <path d="M15 9.5a4 4 0 0 1 0 5" />
    <path d="M17.5 7a8 8 0 0 1 0 10" />
  </svg>
);

export const IconSoundOff = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none" />
    <path d="m15.5 9.5 5 5" />
    <path d="m20.5 9.5-5 5" />
  </svg>
);

export const IconPause = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 4.5v15l12-7.5L7 4.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconRestart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3.5 8a9 9 0 1 1-1 6.5" />
    <path d="M3 3v5h5" />
  </svg>
);

export const IconChevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} strokeWidth={3}>
    <path d="m5 15 7-7 7 7" />
  </svg>
);

export const IconApple = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path
      d="M12 7c-3.5-2-7 0-7 4 0 4.5 3 9 5.5 9 1 0 1-.5 1.5-.5s.5.5 1.5.5C16 20 19 15.5 19 11c0-4-3.5-6-7-4Z"
      fill="currentColor"
      stroke="none"
    />
    <path d="M12 7c0-2 1-3.5 3-4" />
  </svg>
);

export const IconBolt = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTimer = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.8 1.8" />
    <path d="M9.5 2.5h5" />
  </svg>
);

export const IconRuler = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="9" width="18" height="6" rx="1.5" />
    <path d="M7.5 9v3M12 9v3M16.5 9v3" />
  </svg>
);

/* Pixel-art style snake mark used as the logo */
export const LogoMark = ({ size = 34, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...p}>
    <rect width="32" height="32" rx="7" fill="#0d2117" />
    <rect x="1.5" y="1.5" width="29" height="29" rx="5.5" stroke="#2c543b" strokeWidth="1.5" />
    <path
      d="M8 22c0-3 3-4 6-4h4c3 0 5-1 5-4s-2-4-5-4h-2"
      stroke="#a8f04b"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <circle cx="24" cy="22" r="3.2" fill="#ff5349" />
    <circle cx="23" cy="21" r="1" fill="#ffd7d2" />
  </svg>
);

/* small animated snake divider used on the idle overlay */
export const SnakeSquiggle = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 160 14" fill="none" className={className} aria-hidden>
    <path
      d="M4 9c10-8 20 6 30-2s20 6 30-2 20 6 30-2 20 6 30-2 22 6 32 0"
      stroke="#a8f04b"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeDasharray="10 18"
      className="dash-crawl"
    />
    <circle cx="154" cy="6" r="3.4" fill="#ff5349" />
  </svg>
);
