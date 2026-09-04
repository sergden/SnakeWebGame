import type { Dir, Status } from "../game/engine";
import { IconChevron, IconPause, IconPlay } from "./icons";

interface Props {
  status: Status;
  onDir: (d: Dir) => void;
  onCenter: () => void;
}

function PadBtn({
  label,
  rotate,
  onFire,
  children,
  accent = false,
}: {
  label: string;
  rotate?: number;
  onFire: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-ui
      onPointerDown={(e) => {
        e.preventDefault();
        onFire();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`dpad-btn flex aspect-square items-center justify-center rounded-xl border transition-colors ${
        accent
          ? "border-gold-400/50 bg-moss-800 text-gold-300 active:border-gold-300 active:bg-moss-700"
          : "border-moss-600/70 bg-moss-800 text-lime-400 active:border-lime-400/70 active:bg-moss-700"
      } shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_3px_0_rgba(0,0,0,0.4)]`}
    >
      <span style={rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined} className="flex">
        {children}
      </span>
    </button>
  );
}

export default function DPad({ status, onDir, onCenter }: Props) {
  return (
    <div
      className="mx-auto grid w-full max-w-[240px] grid-cols-3 gap-2 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div />
      <PadBtn label="Steer up" onFire={() => onDir("up")}>
        <IconChevron size={22} />
      </PadBtn>
      <div />
      <PadBtn label="Steer left" rotate={-90} onFire={() => onDir("left")}>
        <IconChevron size={22} />
      </PadBtn>
      <PadBtn label={status === "playing" ? "Pause" : "Resume"} accent onFire={onCenter}>
        {status === "playing" ? <IconPause size={20} /> : <IconPlay size={20} />}
      </PadBtn>
      <PadBtn label="Steer right" rotate={90} onFire={() => onDir("right")}>
        <IconChevron size={22} />
      </PadBtn>
      <div />
      <PadBtn label="Steer down" rotate={180} onFire={() => onDir("down")}>
        <IconChevron size={22} />
      </PadBtn>
      <div />
    </div>
  );
}
