import { Sfx } from "./audio";

/* ============================== types & config ============================== */

export type Dir = "up" | "down" | "left" | "right";
export type Status = "idle" | "playing" | "paused" | "dying" | "over" | "win";
export type DiffKey = "garden" | "classic" | "blitz" | "inferno";

export interface DiffConf {
  key: DiffKey;
  label: string;
  interval: number; // ms per step
  mult: number; // score multiplier
  blurb: string;
}

export const DIFFS: Record<DiffKey, DiffConf> = {
  garden: { key: "garden", label: "Garden", interval: 165, mult: 1, blurb: "a lazy sunny stroll" },
  classic: { key: "classic", label: "Classic", interval: 115, mult: 2, blurb: "the honest pace" },
  blitz: { key: "blitz", label: "Blitz", interval: 82, mult: 3, blurb: "caffeinated" },
  inferno: { key: "inferno", label: "Inferno", interval: 58, mult: 5, blurb: "bring a helmet" },
};

export const DIFF_ORDER: DiffKey[] = ["garden", "classic", "blitz", "inferno"];

export const COLS = 20;
export const ROWS = 20;

const BONUS_MS = 6500;
const FOODS_PER_BONUS = 5;
const DYING_MS = 780;

const VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export interface SessionStats {
  runs: number;
  apples: number;
  longest: number;
  bestTimeMs: number;
}

export interface UIState {
  status: Status;
  score: number;
  best: number;
  length: number;
  diff: DiffKey;
  muted: boolean;
  isNewBest: boolean;
  won: boolean;
  elapsedMs: number;
  eaten: number;
  session: SessionStats;
}

interface Cell {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
  kind: "dot" | "text";
  text?: string;
  grav: number;
}

interface GameState {
  snake: Cell[];
  prev: Cell[];
  dir: Dir;
  queue: Dir[];
  food: Cell;
  bonus: (Cell & { expiresAt: number }) | null;
  growthPending: number;
  foodsSinceBonus: number;
  score: number;
  eaten: number;
  status: Status;
  acc: number;
  elapsed: number;
  particles: Particle[];
  shake: number;
  flash: number;
  flashColor: string;
  eatGlow: number;
  deathAt: number;
}

/* ============================== persistence ============================== */

const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, val: string) {
    try {
      window.localStorage.setItem(key, val);
    } catch {
      /* private mode etc. */
    }
  },
};

export function loadBest(diff: DiffKey): number {
  return Number(store.get(`snake.best.${diff}`)) || 0;
}

function saveBest(diff: DiffKey, score: number) {
  store.set(`snake.best.${diff}`, String(score));
}

export function loadInitialUI(): UIState {
  const diff = (DIFF_ORDER.includes(store.get("snake.diff") as DiffKey)
    ? (store.get("snake.diff") as DiffKey)
    : "classic") as DiffKey;
  const muted = store.get("snake.muted") === "1";
  return {
    status: "idle",
    score: 0,
    best: loadBest(diff),
    length: 4,
    diff,
    muted,
    isNewBest: false,
    won: false,
    elapsedMs: 0,
    eaten: 0,
    session: { runs: 0, apples: 0, longest: 0, bestTimeMs: 0 },
  };
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ============================== controller ============================== */

function initialState(): GameState {
  const snake: Cell[] = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  return {
    snake,
    prev: snake.map((c) => ({ ...c })),
    dir: "right",
    queue: [],
    food: { x: 14, y: 10 },
    bonus: null,
    growthPending: 0,
    foodsSinceBonus: 0,
    score: 0,
    eaten: 0,
    status: "idle",
    acc: 0,
    elapsed: 0,
    particles: [],
    shake: 0,
    flash: 0,
    flashColor: "#ff5349",
    eatGlow: 0,
    deathAt: 0,
  };
}

export class GameController {
  sfx = new Sfx();

  private state: GameState = initialState();
  private diff: DiffKey;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private wrap: HTMLElement | null = null;
  private cssSize = 0;
  private dpr = 1;
  private raf = 0;
  private lastFrame = 0;
  private ro: ResizeObserver | null = null;
  private onUi: (p: Partial<UIState>) => void;
  private session: SessionStats = { runs: 0, apples: 0, longest: 0, bestTimeMs: 0 };
  private pointerStart: { x: number; y: number; t: number; ax: number; ay: number } | null = null;
  private destroyed = false;

  constructor(initial: UIState, onUi: (p: Partial<UIState>) => void) {
    this.diff = initial.diff;
    this.sfx.muted = initial.muted;
    this.onUi = onUi;
  }

  /* ---------- lifecycle ---------- */

  attach(canvas: HTMLCanvasElement | null, wrap: HTMLElement | null) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    if (wrap && typeof ResizeObserver !== "undefined") {
      this.ro?.disconnect();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(wrap);
      this.resize();
    }
  }

  startLoop() {
    this.destroyed = false;
    cancelAnimationFrame(this.raf);
    this.lastFrame = performance.now();
    const frame = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(120, now - this.lastFrame);
      this.lastFrame = now;
      this.update(now, dt);
      this.draw(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  bindKeys() {
    window.addEventListener("keydown", this.handleKey);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener("keydown", this.handleKey);
    document.removeEventListener("visibilitychange", this.handleVisibility);
  }

  private resize() {
    if (!this.canvas || !this.wrap) return;
    const rect = this.wrap.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    if (size <= 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssSize = size;
    this.canvas.width = Math.round(size * this.dpr);
    this.canvas.height = Math.round(size * this.dpr);
  }

  /* ---------- input ---------- */

  private handleKey = (e: KeyboardEvent) => {
    const k = e.key;
    const dirs: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    };
    if (dirs[k]) {
      e.preventDefault();
      this.sfx.unlock();
      this.enqueue(dirs[k]);
      return;
    }
    switch (k) {
      case " ":
        e.preventDefault();
        this.sfx.unlock();
        if (this.state.status === "playing" || this.state.status === "paused") this.togglePause();
        else this.primaryAction();
        break;
      case "Enter":
        e.preventDefault();
        this.sfx.unlock();
        this.primaryAction();
        break;
      case "p":
      case "P":
      case "Escape":
        this.togglePause();
        break;
      case "r":
      case "R":
        if (this.state.status === "idle") this.start();
        else this.restart();
        break;
      case "m":
      case "M":
        this.toggleMute();
        break;
      case "1":
      case "2":
      case "3":
      case "4": {
        const d = DIFF_ORDER[Number(k) - 1];
        if (d) this.setDiff(d);
        break;
      }
      default:
        break;
    }
  };

  private handleVisibility = () => {
    if (document.hidden && this.state.status === "playing") this.pause();
  };

  onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-ui]")) return;
    this.sfx.unlock();
    this.pointerStart = { x: e.clientX, y: e.clientY, t: performance.now(), ax: e.clientX, ay: e.clientY };
    try {
      this.wrap?.setPointerCapture(e.pointerId);
    } catch {
      /* ok */
    }
  };

  onPointerMove = (e: React.PointerEvent) => {
    if (!this.pointerStart || this.state.status !== "playing") return;
    const dx = e.clientX - this.pointerStart.ax;
    const dy = e.clientY - this.pointerStart.ay;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    this.enqueue(dir);
    this.pointerStart.ax = e.clientX;
    this.pointerStart.ay = e.clientY;
  };

  onPointerUp = (e: React.PointerEvent) => {
    if (!this.pointerStart) return;
    const dist = Math.hypot(e.clientX - this.pointerStart.x, e.clientY - this.pointerStart.y);
    const dt = performance.now() - this.pointerStart.t;
    this.pointerStart = null;
    if (dist < 12 && dt < 300) this.primaryAction();
  };

  /* ---------- public actions ---------- */

  enqueue(dir: Dir) {
    const s = this.state;
    if (s.status === "idle") {
      this.start();
    }
    if (s.status !== "playing") return;
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (dir === last || dir === OPPOSITE[last]) return;
    if (s.queue.length < 3) s.queue.push(dir);
  }

  primaryAction() {
    const st = this.state.status;
    if (st === "idle") this.start();
    else if (st === "paused") this.resume();
    else if (st === "over" || st === "win") this.restart();
  }

  start() {
    if (this.state.status === "playing" || this.state.status === "dying") return;
    this.state = initialState();
    this.state.status = "playing";
    this.spawnFood();
    this.addText(COLS / 2, ROWS / 2 - 1.5, "GO!", "#c6ff6b");
    this.sfx.start();
    this.onUi({
      status: "playing",
      score: 0,
      length: this.state.snake.length,
      eaten: 0,
      isNewBest: false,
      won: false,
      elapsedMs: 0,
    });
  }

  restart() {
    if (this.state.status === "dying") return;
    this.start();
  }

  pause() {
    if (this.state.status !== "playing") return;
    this.state.status = "paused";
    this.sfx.pause();
    this.onUi({ status: "paused" });
  }

  resume() {
    if (this.state.status !== "paused") return;
    this.state.status = "playing";
    this.sfx.resume();
    this.onUi({ status: "playing" });
  }

  togglePause() {
    if (this.state.status === "playing") this.pause();
    else if (this.state.status === "paused") this.resume();
  }

  setDiff(k: DiffKey) {
    if (this.diff === k) return;
    this.diff = k;
    store.set("snake.diff", k);
    this.sfx.click();
    this.onUi({ diff: k, best: loadBest(k) });
  }

  toggleMute() {
    const muted = !this.sfx.muted;
    this.sfx.muted = muted;
    store.set("snake.muted", muted ? "1" : "0");
    if (!muted) this.sfx.click();
    this.onUi({ muted });
  }

  /* ---------- simulation ---------- */

  private interval(): number {
    return DIFFS[this.diff].interval;
  }

  private update(now: number, dt: number) {
    const s = this.state;
    if (s.status === "playing") {
      s.elapsed += dt;
      s.acc += dt;
      let guard = 0;
      while (s.acc >= this.interval() && s.status === "playing" && guard < 8) {
        s.acc -= this.interval();
        this.tick(now);
        guard++;
      }
    }
    if (s.status === "dying" && now - s.deathAt > DYING_MS) {
      this.finalize(false);
    }
    // bonus expiry
    if (s.bonus && s.status === "playing" && now > s.bonus.expiresAt) {
      this.addBurst(s.bonus.x + 0.5, s.bonus.y + 0.5, "#ffc94d", 8, 0.055, 500);
      this.sfx.bonusFizzle();
      s.bonus = null;
    }
    // decay juice
    s.shake = Math.max(0, s.shake - dt * 0.03);
    s.flash = Math.max(0, s.flash - dt * 0.0024);
    s.eatGlow = Math.max(0, s.eatGlow - dt / 300);
    // particles
    if (s.status !== "paused") {
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
          continue;
        }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
  }

  private tick(now: number) {
    const s = this.state;
    while (s.queue.length) {
      const d = s.queue.shift()!;
      if (d !== s.dir && d !== OPPOSITE[s.dir]) {
        s.dir = d;
        this.sfx.turn();
        break;
      }
    }
    const v = VEC[s.dir];
    const head = s.snake[0];
    const nh = { x: head.x + v.x, y: head.y + v.y };

    // walls
    if (nh.x < 0 || nh.y < 0 || nh.x >= COLS || nh.y >= ROWS) {
      this.die(now);
      return;
    }
    const willGrow = s.growthPending > 0;
    const body = willGrow ? s.snake : s.snake.slice(0, -1);
    if (body.some((c) => c.x === nh.x && c.y === nh.y)) {
      this.die(now);
      return;
    }

    s.prev = s.snake.map((c) => ({ ...c }));
    s.snake = [nh, ...s.snake];
    if (willGrow) s.growthPending--;
    else s.snake.pop();

    const mult = DIFFS[this.diff].mult;

    // apple
    if (nh.x === s.food.x && nh.y === s.food.y) {
      s.score += 10 * mult;
      s.eaten++;
      s.foodsSinceBonus++;
      s.growthPending += 1;
      s.eatGlow = 1;
      s.shake = Math.max(s.shake, 2.2);
      this.addBurst(nh.x + 0.5, nh.y + 0.5, "#ff5349", 12, 0.085, 520);
      this.addText(nh.x + 0.5, nh.y - 0.2, `+${10 * mult}`, "#c6ff6b");
      this.sfx.eat();
      if (!this.spawnFood()) {
        this.finalize(true);
        return;
      }
      if (s.foodsSinceBonus >= FOODS_PER_BONUS && !s.bonus) {
        this.spawnBonus(now);
        s.foodsSinceBonus = 0;
      }
      this.onUi({ score: s.score, length: s.snake.length, eaten: s.eaten });
    }

    // gold fruit
    if (s.bonus && nh.x === s.bonus.x && nh.y === s.bonus.y) {
      s.score += 50 * mult;
      s.growthPending += 2;
      s.eatGlow = 1;
      s.shake = Math.max(s.shake, 4.5);
      this.addBurst(nh.x + 0.5, nh.y + 0.5, "#ffc94d", 18, 0.1, 600);
      this.addText(nh.x + 0.5, nh.y - 0.2, `+${50 * mult}`, "#ffe08a");
      this.sfx.bonus();
      s.bonus = null;
      this.onUi({ score: s.score, length: s.snake.length });
    }
  }

  private die(now: number) {
    const s = this.state;
    if (s.status !== "playing") return;
    s.status = "dying";
    s.deathAt = now;
    s.shake = 16;
    s.flash = 1;
    s.flashColor = "#ff5349";
    const h = s.snake[0];
    this.addBurst(h.x + 0.5, h.y + 0.5, "#c6ff6b", 22, 0.12, 700);
    this.addBurst(h.x + 0.5, h.y + 0.5, "#ff5349", 10, 0.09, 600);
    this.sfx.die();
  }

  private finalize(won: boolean) {
    const s = this.state;
    s.status = won ? "win" : "over";
    const prevBest = loadBest(this.diff);
    const isNewBest = s.score > prevBest && s.score > 0;
    if (isNewBest) saveBest(this.diff, s.score);
    this.session = {
      runs: this.session.runs + 1,
      apples: this.session.apples + s.eaten,
      longest: Math.max(this.session.longest, s.snake.length),
      bestTimeMs: Math.max(this.session.bestTimeMs, s.elapsed),
    };
    if (won || isNewBest) this.sfx.best();
    else this.sfx.gameOver();
    this.onUi({
      status: s.status,
      best: isNewBest ? s.score : prevBest,
      isNewBest,
      won,
      elapsedMs: s.elapsed,
      session: { ...this.session },
    });
  }

  /* ---------- spawning & particles ---------- */

  private emptyCells(exclude: Cell[]): Cell[] {
    const taken = new Set(exclude.map((c) => `${c.x},${c.y}`));
    const out: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!taken.has(`${x},${y}`)) out.push({ x, y });
      }
    }
    return out;
  }

  private spawnFood(): boolean {
    const s = this.state;
    const free = this.emptyCells([...s.snake, ...(s.bonus ? [s.bonus] : [])]);
    if (!free.length) return false;
    s.food = free[Math.floor(Math.random() * free.length)];
    return true;
  }

  private spawnBonus(now: number) {
    const s = this.state;
    const free = this.emptyCells([...s.snake, s.food]);
    if (!free.length) return;
    const cell = free[Math.floor(Math.random() * free.length)];
    s.bonus = { ...cell, expiresAt: now + BONUS_MS };
    this.addText(cell.x + 0.5, cell.y - 0.3, "GOLD!", "#ffe08a");
  }

  private addBurst(cx: number, cy: number, color: string, count: number, speed: number, ttl: number) {
    const s = this.state;
    if (s.particles.length > 160) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.9);
      s.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.02,
        life: ttl * (0.6 + Math.random() * 0.4),
        ttl,
        size: 0.06 + Math.random() * 0.09,
        color,
        kind: "dot",
        grav: 0.00022,
      });
    }
  }

  private addText(cx: number, cy: number, text: string, color: string) {
    this.state.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: -0.0011,
      life: 850,
      ttl: 850,
      size: 0.34,
      color,
      kind: "text",
      text,
      grav: 0,
    });
  }

  /* ---------- rendering ---------- */

  private draw(now: number) {
    const ctx = this.ctx;
    const s = this.state;
    if (!ctx || this.cssSize <= 0) return;
    const size = this.cssSize;
    const cell = size / COLS;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // board base
    ctx.fillStyle = "#0c1f15";
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    if (s.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
    }

    // checkerboard
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) continue;
        ctx.fillStyle = "#0f2519";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    // faint grid lines
    ctx.strokeStyle = "rgba(168,240,75,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < COLS; i++) {
      ctx.moveTo(i * cell + 0.5, 0);
      ctx.lineTo(i * cell + 0.5, size);
      ctx.moveTo(0, i * cell + 0.5);
      ctx.lineTo(size, i * cell + 0.5);
    }
    ctx.stroke();

    // progress fraction for interpolation
    const t = s.status === "playing" ? Math.min(1, s.acc / this.interval()) : 1;

    this.drawFood(ctx, now, cell);
    if (s.bonus) this.drawBonus(ctx, now, cell);
    this.drawSnake(ctx, now, cell, t);
    this.drawParticles(ctx, cell);

    ctx.restore();

    // vignette
    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(3,10,6,0.42)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, size, size);

    // hurt / juice flash
    if (s.flash > 0) {
      ctx.globalAlpha = s.flash * 0.4;
      ctx.fillStyle = s.flashColor;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
    }

    // inner rim
    ctx.strokeStyle = "rgba(168,240,75,0.1)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }

  private lerpPoints(cell: number, t: number): { x: number; y: number }[] {
    const s = this.state;
    return s.snake.map((c, i) => {
      const from = s.prev[Math.min(i, s.prev.length - 1)] ?? c;
      return {
        x: (from.x + (c.x - from.x) * t + 0.5) * cell,
        y: (from.y + (c.y - from.y) * t + 0.5) * cell,
      };
    });
  }

  private drawSnake(ctx: CanvasRenderingContext2D, now: number, cell: number, t: number) {
    const s = this.state;
    const pts = this.lerpPoints(cell, t);
    if (!pts.length) return;
    const dead = s.status === "dying" || s.status === "over" || s.status === "win";
    const head = pts[0];
    const tail = pts[pts.length - 1];

    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    if (dead && s.status !== "win") {
      grad.addColorStop(0, "#8fb89c");
      grad.addColorStop(1, "#4a6b56");
    } else {
      grad.addColorStop(0, "#c6ff6b");
      grad.addColorStop(0.3, "#8fe84f");
      grad.addColorStop(0.65, "#3bbe63");
      grad.addColorStop(1, "#1f7a48");
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // glow pass when eating
    if (s.eatGlow > 0.02) {
      ctx.save();
      ctx.shadowColor = "rgba(198,255,107,0.9)";
      ctx.shadowBlur = 18 * s.eatGlow;
      ctx.strokeStyle = "rgba(198,255,107,0.35)";
      ctx.lineWidth = cell * 0.8;
      this.strokePath(ctx, pts);
      ctx.restore();
    }

    // dark outline
    ctx.strokeStyle = "#0b2b1c";
    ctx.lineWidth = cell * 0.88;
    this.strokePath(ctx, pts);
    // body
    ctx.strokeStyle = grad;
    ctx.lineWidth = cell * 0.7;
    this.strokePath(ctx, pts);

    // belly scales
    ctx.fillStyle = "rgba(226,255,196,0.16)";
    for (let i = 2; i < pts.length - 1; i += 2) {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, cell * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }

    // head plate
    const v = VEC[s.dir];
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.fillStyle = dead && s.status !== "win" ? "#a9c9b2" : "#c6ff6b";
    ctx.strokeStyle = "#0b2b1c";
    ctx.lineWidth = Math.max(1.5, cell * 0.07);
    const r = cell * 0.46;
    this.roundRect(ctx, -r, -r, r * 2, r * 2, cell * 0.3);
    ctx.fill();
    ctx.stroke();

    // tongue flick
    const flick = Math.sin(now / 300) > 0.93 || s.eatGlow > 0.5;
    if (flick && !dead) {
      ctx.strokeStyle = "#ff5349";
      ctx.lineWidth = Math.max(1.2, cell * 0.055);
      ctx.beginPath();
      ctx.moveTo(v.x * r * 0.7, v.y * r * 0.7);
      ctx.lineTo(v.x * (r + cell * 0.28), v.y * (r + cell * 0.28));
      const tx = v.x * (r + cell * 0.28);
      const ty = v.y * (r + cell * 0.28);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + (-v.y + v.x) * cell * 0.08, ty + (v.x + v.y) * cell * 0.08);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + (v.y + v.x) * cell * 0.08, ty + (-v.x + v.y) * cell * 0.08);
      ctx.stroke();
    }

    // eyes
    const px = -v.y;
    const py = v.x;
    const f = cell * 0.13;
    const sd = cell * 0.19;
    const blink = !dead && now % 3400 < 130;
    for (const sign of [1, -1]) {
      const ex = v.x * f + px * sd * sign;
      const ey = v.y * f + py * sd * sign;
      if (dead) {
        // X eyes
        ctx.strokeStyle = "#123524";
        ctx.lineWidth = Math.max(1.4, cell * 0.06);
        const e = cell * 0.09;
        ctx.beginPath();
        ctx.moveTo(ex - e, ey - e);
        ctx.lineTo(ex + e, ey + e);
        ctx.moveTo(ex + e, ey - e);
        ctx.lineTo(ex - e, ey + e);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#f4ffe8";
        ctx.beginPath();
        ctx.ellipse(ex, ey, cell * 0.125, blink ? cell * 0.02 : cell * 0.125, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!blink) {
          ctx.fillStyle = "#123524";
          ctx.beginPath();
          ctx.arc(ex + v.x * cell * 0.05, ey + v.y * cell * 0.05, cell * 0.062, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  private strokePath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y);
    ctx.stroke();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private drawFood(ctx: CanvasRenderingContext2D, now: number, cell: number) {
    const s = this.state;
    const pulse = 1 + Math.sin(now / 210) * 0.09;
    const cx = (s.food.x + 0.5) * cell;
    const cy = (s.food.y + 0.5) * cell;
    const r = cell * 0.32 * pulse;
    ctx.save();
    ctx.shadowColor = "rgba(255,83,73,0.8)";
    ctx.shadowBlur = 12 * pulse;
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r * 1.15);
    g.addColorStop(0, "#ff9d8a");
    g.addColorStop(0.45, "#ff5349");
    g.addColorStop(1, "#b81f1a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // stem + leaf
    ctx.strokeStyle = "#7a4a22";
    ctx.lineWidth = Math.max(1.4, cell * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.85);
    ctx.lineTo(cx + cell * 0.05, cy - r * 1.25);
    ctx.stroke();
    ctx.fillStyle = "#5fc96a";
    ctx.beginPath();
    ctx.ellipse(cx + cell * 0.16, cy - r * 1.15, cell * 0.14, cell * 0.07, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy - r * 0.35, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBonus(ctx: CanvasRenderingContext2D, now: number, cell: number) {
    const s = this.state;
    if (!s.bonus) return;
    const remain = Math.max(0, Math.min(1, (s.bonus.expiresAt - now) / BONUS_MS));
    const blink = remain < 0.25 ? (Math.sin(now / 90) > 0 ? 1 : 0.35) : 1;
    const cx = (s.bonus.x + 0.5) * cell;
    const cy = (s.bonus.y + 0.5) * cell;
    const r = cell * 0.33 * (1 + Math.sin(now / 160) * 0.06);
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.shadowColor = "rgba(255,201,77,0.95)";
    ctx.shadowBlur = 16;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.2);
    g.addColorStop(0, "#fff0bd");
    g.addColorStop(0.5, "#ffc94d");
    g.addColorStop(1, "#d98c1f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // star mark
    ctx.fillStyle = "rgba(122,74,10,0.6)";
    this.star(ctx, cx, cy, 5, r * 0.5, r * 0.22, now / 900);
    ctx.fill();
    ctx.restore();
    // timer ring
    ctx.strokeStyle = "rgba(255,201,77,0.9)";
    ctx.lineWidth = Math.max(2, cell * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain);
    ctx.stroke();
  }

  private star(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outer: number,
    inner: number,
    rot: number,
  ) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = rot + (i * Math.PI) / spikes - Math.PI / 2;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, cell: number) {
    const s = this.state;
    for (const p of s.particles) {
      const a = Math.max(0, Math.min(1, p.life / p.ttl));
      if (p.kind === "dot") {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * cell, p.y * cell, p.size * cell * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.font = `${Math.round(cell * p.size)}px "Press Start 2P", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#0b2b1c";
        ctx.fillText(p.text ?? "", p.x * cell + 2, p.y * cell + 2);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text ?? "", p.x * cell, p.y * cell);
      }
    }
    ctx.globalAlpha = 1;
  }
}
