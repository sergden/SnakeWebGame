import type { DiffKey, UIState } from "../game/engine";
import { DIFFS, DIFF_ORDER, formatTime } from "../game/engine";
import { IconCrown, IconPlay, IconRestart, IconRuler, IconTimer, SnakeSquiggle } from "./icons";

/* ---------------- shared bits ---------------- */

export function DiffPicker({
  value,
  onChange,
  compact = false,
}: {
  value: DiffKey;
  onChange: (k: DiffKey) => void;
  compact?: boolean;
}) {
  return (
    <div data-ui className="flex flex-wrap justify-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
      {DIFF_ORDER.map((k, i) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            title={DIFFS[k].blurb}
            className={`group rounded-lg border px-2.5 py-1.5 transition-all duration-150 ${
              active
                ? "border-lime-400/80 bg-lime-400/15 text-lime-300 shadow-[0_0_14px_rgba(168,240,75,0.25)]"
                : "border-moss-600/70 bg-moss-850 text-moss-300 hover:border-moss-400 hover:text-moss-100"
            }`}
          >
            <span className={`font-pixel block leading-none ${compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"}`}>
              {DIFFS[k].label}
            </span>
            <span className="mt-1.5 flex justify-center gap-[3px]">
              {DIFF_ORDER.map((_, d) => (
                <span
                  key={d}
                  className={`h-[4px] w-[4px] rounded-full ${
                    d <= i ? (active ? "bg-lime-400" : "bg-moss-400") : "bg-moss-700"
                  }`}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ArcadeButton({
  children,
  onClick,
  variant = "lime",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "lime" | "ghost";
  className?: string;
}) {
  const styles =
    variant === "lime"
      ? "bg-lime-400 text-moss-950 shadow-[0_4px_0_#4a7a20,0_10px_26px_rgba(168,240,75,0.35)] hover:bg-lime-300 glow-throb"
      : "bg-moss-800 text-moss-100 border border-moss-600 shadow-[0_4px_0_#0a1a10] hover:bg-moss-700 hover:border-moss-400";
  return (
    <button
      type="button"
      data-ui
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={`font-pixel inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-[11px] tracking-wide transition-all duration-100 active:translate-y-[3px] active:shadow-none ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[rgba(4,12,7,0.78)] p-3 backdrop-blur-[3px]">
      <div
        data-ui
        onPointerDown={(e) => e.stopPropagation()}
        className="overlay-in my-auto flex w-full max-w-sm flex-col items-center text-center"
      >
        {children}
      </div>
    </div>
  );
}

function StatRow({ ui }: { ui: UIState }) {
  return (
    <div className="mt-4 grid w-full grid-cols-2 gap-2">
      <div className="rounded-xl border border-moss-600/60 bg-moss-900/80 px-3 py-2.5">
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-widest text-moss-300 uppercase">
          <IconTimer size={12} /> Time
        </div>
        <div className="font-pixel mt-1 text-[12px] text-moss-100">{formatTime(ui.elapsedMs)}</div>
      </div>
      <div className="rounded-xl border border-moss-600/60 bg-moss-900/80 px-3 py-2.5">
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-widest text-moss-300 uppercase">
          <IconRuler size={12} /> Length
        </div>
        <div className="font-pixel mt-1 text-[12px] text-moss-100">{ui.length}</div>
      </div>
    </div>
  );
}

/* ---------------- the overlay switch ---------------- */

interface Props {
  ui: UIState;
  onPrimary: () => void;
  onResume: () => void;
  onRestart: () => void;
  onDiff: (k: DiffKey) => void;
}

export default function GameOverlay({ ui, onPrimary, onResume, onRestart, onDiff }: Props) {
  if (ui.status === "playing" || ui.status === "dying") return null;

  if (ui.status === "idle") {
    return (
      <Shell>
        <h2 className="font-pixel text-[26px] leading-none text-lime-400 sm:text-[32px] [text-shadow:0_0_24px_rgba(168,240,75,0.45),0_3px_0_#1c3b29]">
          SNAKE
        </h2>
        <SnakeSquiggle className="mt-3 h-3.5 w-40" />
        <p className="mt-3 text-sm text-moss-300">
          Eat apples. Grab gold fruit. Don&apos;t bite yourself.
        </p>
        {ui.best > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-[12px] font-semibold text-gold-300">
            <IconCrown size={13} /> Best on {DIFFS[ui.diff].label}: {ui.best.toLocaleString()}
          </div>
        )}
        <div className="mt-5 w-full">
          <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-moss-400 uppercase">Difficulty</div>
          <DiffPicker value={ui.diff} onChange={onDiff} />
          <div className="mt-2 text-[11px] text-moss-400 italic">{DIFFS[ui.diff].blurb} · points ×{DIFFS[ui.diff].mult}</div>
        </div>
        <ArcadeButton onClick={onPrimary} className="mt-5 w-full max-w-[240px]">
          <IconPlay size={14} /> Start
        </ArcadeButton>
        <p className="mt-4 text-[11px] text-moss-400">
          <span className="keycap">SPACE</span> to start · steer with <span className="keycap">WASD</span> /{" "}
          <span className="keycap">↑↓←→</span> or swipe
        </p>
      </Shell>
    );
  }

  if (ui.status === "paused") {
    return (
      <Shell>
        <h2 className="font-pixel blink-hard text-[22px] text-moss-100 [text-shadow:0_0_18px_rgba(198,255,107,0.35)] sm:text-[26px]">
          PAUSED
        </h2>
        <p className="mt-3 text-sm text-moss-300">
          The garden waits. Score <span className="font-bold text-lime-300">{ui.score.toLocaleString()}</span> · length{" "}
          <span className="font-bold text-lime-300">{ui.length}</span>
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <ArcadeButton onClick={onResume}>
            <IconPlay size={13} /> Resume
          </ArcadeButton>
          <ArcadeButton onClick={onRestart} variant="ghost">
            <IconRestart size={13} /> Restart
          </ArcadeButton>
        </div>
        <div className="mt-6 w-full">
          <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-moss-400 uppercase">Speed · applies live</div>
          <DiffPicker value={ui.diff} onChange={onDiff} compact />
        </div>
        <p className="mt-5 text-[11px] text-moss-400">
          <span className="keycap">P</span> or <span className="keycap">SPACE</span> to resume
        </p>
      </Shell>
    );
  }

  const won = ui.status === "win";
  return (
    <Shell>
      <h2
        className={`font-pixel gameover-shake text-[20px] leading-tight sm:text-[26px] ${
          won ? "text-gold-300 [text-shadow:0_0_26px_rgba(255,201,77,0.5)]" : "text-apple-500 [text-shadow:0_0_26px_rgba(255,83,73,0.45)]"
        }`}
      >
        {won ? "GARDEN CLEARED!" : "GAME OVER"}
      </h2>

      {ui.isNewBest && (
        <div className="badge-wiggle font-pixel mt-3 inline-flex items-center gap-2 rounded-lg border border-gold-300/70 bg-gold-400/15 px-3 py-2 text-[10px] text-gold-300 shadow-[0_0_20px_rgba(255,201,77,0.35)]">
          <IconCrown size={14} /> NEW BEST!
        </div>
      )}

      <div className="mt-4 w-full rounded-2xl border border-moss-600/60 bg-moss-900/85 px-5 py-4">
        <div className="text-[10px] font-bold tracking-[0.24em] text-moss-400 uppercase">Final score</div>
        <div className="font-pixel mt-1 text-[24px] text-lime-300 [text-shadow:0_0_18px_rgba(198,255,107,0.35)] sm:text-[28px]">
          {ui.score.toLocaleString()}
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-gold-300">
          <IconCrown size={13} /> Best {ui.best.toLocaleString()}
          <span className="text-moss-400">· {DIFFS[ui.diff].label} ×{DIFFS[ui.diff].mult}</span>
        </div>
        <StatRow ui={ui} />
      </div>

      <ArcadeButton onClick={onPrimary} className="mt-5 w-full max-w-[240px]">
        <IconRestart size={13} /> Play again
      </ArcadeButton>
      <p className="mt-4 text-[11px] text-moss-400">
        <span className="keycap">ENTER</span> to restart · <span className="keycap">1–4</span> change difficulty
      </p>
    </Shell>
  );
}
