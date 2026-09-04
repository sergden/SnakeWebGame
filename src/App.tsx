import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiffKey, UIState } from "./game/engine";
import { DIFFS, GameController, formatTime, loadInitialUI } from "./game/engine";
import GameOverlay, { DiffPicker } from "./components/Overlays";
import DPad from "./components/DPad";
import {
  IconApple,
  IconBolt,
  IconCrown,
  IconPause,
  IconPlay,
  IconRestart,
  IconRuler,
  IconSoundOff,
  IconSoundOn,
  IconTimer,
  LogoMark,
} from "./components/icons";

/* ---------------- ambient spores ---------------- */

const SPORE_COLORS = ["rgba(168,240,75,0.55)", "rgba(255,201,77,0.45)", "rgba(95,201,106,0.5)"];

function Spores() {
  const spores = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 71) % 100}%`,
        size: 3 + ((i * 37) % 4),
        color: SPORE_COLORS[i % SPORE_COLORS.length],
        dur: 16 + ((i * 53) % 16),
        delay: -((i * 29) % 20),
        drift: ((i % 5) - 2) * 26,
        op: 0.25 + ((i * 13) % 30) / 100,
      })),
    [],
  );
  return (
    <>
      {spores.map((s) => (
        <span
          key={s.id}
          className="spore"
          style={
            {
              left: s.left,
              top: "100%",
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
              filter: "blur(0.5px)",
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
              "--spore-x": `${s.drift}px`,
              "--spore-op": s.op,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

/* ---------------- small UI helpers ---------------- */

function DeckButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="font-pixel flex items-center gap-2 rounded-lg border border-moss-600/80 bg-moss-800 px-3.5 py-2.5 text-[9px] text-moss-100 shadow-[0_3px_0_rgba(0,0,0,0.45)] transition-all duration-100 hover:border-lime-400/60 hover:text-lime-300 active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function HudCell({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-1.5 py-2 text-center sm:px-3">
      <div className="flex items-center justify-center gap-1 text-[8px] font-bold tracking-[0.18em] text-moss-400 uppercase sm:text-[9px]">
        {icon}
        {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

const LED: Record<UIState["status"], { color: string; label: string; pulse?: boolean }> = {
  idle: { color: "bg-moss-400", label: "READY" },
  playing: { color: "bg-lime-400", label: "LIVE", pulse: true },
  paused: { color: "bg-gold-400", label: "PAUSED" },
  dying: { color: "bg-apple-500", label: "OUCH", pulse: true },
  over: { color: "bg-apple-500", label: "GAME OVER" },
  win: { color: "bg-gold-400", label: "CLEARED" },
};

/* ---------------- app ---------------- */

export default function App() {
  const [ui, setUi] = useState<UIState>(() => loadInitialUI());
  const patch = useCallback((p: Partial<UIState>) => setUi((prev) => ({ ...prev, ...p })), []);

  const ctrlRef = useRef<GameController | null>(null);
  if (!ctrlRef.current) ctrlRef.current = new GameController(loadInitialUI(), patch);
  const ctrl = ctrlRef.current;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ctrl.attach(canvasRef.current, wrapRef.current);
    ctrl.bindKeys();
    ctrl.startLoop();
    return () => ctrl.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showPad, setShowPad] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setShowPad(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const led = LED[ui.status];
  const canPause = ui.status === "playing" || ui.status === "paused";
  const diff = DIFFS[ui.diff];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="bg-glow absolute inset-0" />
        <div className="bg-grid-lines absolute inset-0" />
        <Spores />
        <div className="bg-vignette absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 pb-6 sm:px-5">
        {/* header */}
        <header className="flex items-center justify-between py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <LogoMark size={38} className="drop-shadow-[0_0_14px_rgba(168,240,75,0.25)]" />
            <div>
              <h1 className="font-pixel text-[15px] leading-none text-lime-400 [text-shadow:0_0_18px_rgba(168,240,75,0.4)] sm:text-[17px]">
                SNAKE
              </h1>
              <p className="mt-1.5 text-[10px] font-semibold tracking-[0.3em] text-moss-400 uppercase">
                Garden Arcade
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={ui.muted ? "Unmute sound" : "Mute sound"}
            title={ui.muted ? "Unmute (M)" : "Mute (M)"}
            onClick={() => ctrl.toggleMute()}
            className={`rounded-xl border p-2.5 transition-all duration-150 active:translate-y-[2px] ${
              ui.muted
                ? "border-moss-600 bg-moss-850 text-moss-400 hover:text-moss-200"
                : "border-lime-400/40 bg-lime-400/10 text-lime-300 hover:bg-lime-400/20"
            }`}
          >
            {ui.muted ? <IconSoundOff size={17} /> : <IconSoundOn size={17} />}
          </button>
        </header>

        {/* cabinet */}
        <main className="mx-auto w-full max-w-[600px]">
          <div className="relative rounded-2xl border-2 border-moss-600/80 bg-moss-900/90 p-2.5 shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_0_1px_rgba(168,240,75,0.07),inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-3.5">
            {/* corner screws */}
            {["top-1.5 left-1.5", "top-1.5 right-1.5", "bottom-1.5 left-1.5", "bottom-1.5 right-1.5"].map((pos) => (
              <span key={pos} className={`absolute ${pos} hidden h-1.5 w-1.5 rounded-full bg-moss-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] sm:block`} />
            ))}

            {/* HUD strip */}
            <div className="mb-2.5 grid grid-cols-4 divide-x divide-moss-700/70 rounded-xl border border-moss-700/70 bg-moss-950/70 sm:mb-3">
              <HudCell label="Score">
                <span key={ui.score} className="score-pop font-pixel text-[12px] text-lime-300 [text-shadow:0_0_14px_rgba(198,255,107,0.35)] sm:text-[15px]">
                  {ui.score.toLocaleString()}
                </span>
              </HudCell>
              <HudCell label="Best" icon={<IconCrown size={10} className="text-gold-400" />}>
                <span key={ui.best} className="score-pop font-pixel text-[12px] text-gold-300 sm:text-[15px]">
                  {ui.best.toLocaleString()}
                </span>
              </HudCell>
              <HudCell label="Length">
                <span className="font-pixel text-[12px] text-moss-100 sm:text-[15px]">{ui.length}</span>
              </HudCell>
              <HudCell label="Speed">
                <span className="font-pixel block text-[8px] leading-tight text-moss-100 sm:text-[10px]">
                  {diff.label}
                  <span className="text-gold-300"> ×{diff.mult}</span>
                </span>
              </HudCell>
            </div>

            {/* board */}
            <div
              ref={wrapRef}
              onPointerDown={ctrl.onPointerDown}
              onPointerMove={ctrl.onPointerMove}
              onPointerUp={ctrl.onPointerUp}
              onPointerCancel={ctrl.onPointerUp}
              className="game-touch relative aspect-square w-full overflow-hidden rounded-lg select-none"
            >
              <canvas ref={canvasRef} className="block h-full w-full" />
              <div className="scanlines crt-flicker pointer-events-none absolute inset-0 z-10" />
              {/* status LED */}
              <div className="pointer-events-none absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-full border border-moss-700/80 bg-moss-950/75 px-2 py-1">
                <span className={`h-1.5 w-1.5 rounded-full ${led.color} ${led.pulse ? "animate-pulse" : ""}`} />
                <span className="font-pixel text-[7px] text-moss-300">{led.label}</span>
              </div>

              <GameOverlay
                ui={ui}
                onPrimary={() => ctrl.primaryAction()}
                onResume={() => ctrl.resume()}
                onRestart={() => ctrl.restart()}
                onDiff={(k: DiffKey) => ctrl.setDiff(k)}
              />
            </div>
          </div>

          {/* control deck */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-moss-700/70 bg-moss-900/60 p-2.5">
            <DiffPicker value={ui.diff} onChange={(k: DiffKey) => ctrl.setDiff(k)} compact />
            <div className="flex gap-2">
              <DeckButton
                label={ui.status === "playing" ? "Pause" : "Resume"}
                disabled={!canPause}
                onClick={() => ctrl.togglePause()}
              >
                {ui.status === "playing" ? <IconPause size={12} /> : <IconPlay size={12} />}
                {ui.status === "playing" ? "PAUSE" : "RESUME"}
              </DeckButton>
              <DeckButton label="Restart" disabled={ui.status === "dying"} onClick={() => ctrl.restart()}>
                <IconRestart size={12} />
                RESTART
              </DeckButton>
            </div>
          </div>

          {/* touch pad */}
          <div className={showPad ? "mt-4" : "mt-4 md:hidden"}>
            <DPad
              status={ui.status}
              onDir={(d) => ctrl.enqueue(d)}
              onCenter={() => (canPause ? ctrl.togglePause() : ctrl.primaryAction())}
            />
            <p className="mt-2 text-center text-[11px] text-moss-400">swipe the board or tap the pad</p>
          </div>

          {/* info panels */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <section className="panel-in rounded-xl border border-moss-700/70 bg-moss-900/60 p-4">
              <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-[0.24em] text-moss-400 uppercase">
                <IconBolt size={12} className="text-lime-400" /> Controls
              </h3>
              <ul className="mt-3 space-y-2.5 text-[13px] text-moss-200">
                <li className="flex items-center justify-between gap-3">
                  <span className="flex gap-1">
                    <span className="keycap">W</span>
                    <span className="keycap">A</span>
                    <span className="keycap">S</span>
                    <span className="keycap">D</span>
                    <span className="text-moss-500 self-center px-0.5 text-[11px]">/</span>
                    <span className="keycap">↑↓←→</span>
                  </span>
                  <span className="text-moss-300">steer</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex gap-1">
                    <span className="keycap">SPACE</span>
                    <span className="keycap">P</span>
                  </span>
                  <span className="text-moss-300">pause · resume</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex gap-1">
                    <span className="keycap">R</span>
                    <span className="keycap">M</span>
                    <span className="keycap">1–4</span>
                  </span>
                  <span className="text-moss-300">restart · sound · speed</span>
                </li>
              </ul>
            </section>

            <section className="panel-in rounded-xl border border-moss-700/70 bg-moss-900/60 p-4" style={{ animationDelay: "0.08s" }}>
              <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-[0.24em] text-moss-400 uppercase">
                <IconTimer size={12} className="text-gold-400" /> This session
              </h3>
              <ul className="mt-3 space-y-2 text-[13px]">
                <li className="flex items-center justify-between">
                  <span className="text-moss-300">Runs</span>
                  <span className="font-pixel text-[11px] text-moss-100">{ui.session.runs}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-moss-300">
                    <IconApple size={13} className="text-apple-500" /> Apples eaten
                  </span>
                  <span className="font-pixel text-[11px] text-moss-100">{ui.session.apples}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-moss-300">
                    <IconRuler size={13} className="text-lime-400" /> Longest snake
                  </span>
                  <span className="font-pixel text-[11px] text-moss-100">{ui.session.longest || "—"}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-moss-300">Longest run</span>
                  <span className="font-pixel text-[11px] text-moss-100">
                    {ui.session.bestTimeMs ? formatTime(ui.session.bestTimeMs) : "—"}
                  </span>
                </li>
              </ul>
              <p className="mt-3 border-t border-moss-700/60 pt-2.5 text-[11px] leading-relaxed text-moss-400">
                Every 5th apple lures a <span className="font-semibold text-gold-300">gold fruit</span> worth ×5 — it
                vanishes in 6.5s. Best score is saved per difficulty on this device.
              </p>
            </section>
          </div>
        </main>

        <footer className="mt-auto pt-8 text-center text-[11px] text-moss-500">
          hand-rolled canvas · no snakes were harmed · <span className="text-moss-400">M</span> toggles the bleeps
        </footer>
      </div>
    </div>
  );
}
