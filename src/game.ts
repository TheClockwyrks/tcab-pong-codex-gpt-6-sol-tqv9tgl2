import type { Game, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;
  readonly simTime: number;
  readonly muted: boolean;
  readonly pointerStart: { readonly id: number; readonly index: number } | null;
}
export const BACKGROUND = "#080f1d";
type ReadState = DeepReadonly<CaromState>;
type Rect = { x: number; y: number; w: number; h: number };
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: ReadState): CaromState;
  spawnBall(s: ReadState): CaromState;
  spawnObstacle(s: ReadState, index: number): CaromState;
  reset(s: ReadState): CaromState;
  reconcile(s: ReadState): CaromState;
  setScreen(s: ReadState, value: Screen): CaromState;
  setMode(s: ReadState, value: Mode): CaromState;
  setMenuIndex(s: ReadState, value: number): CaromState;
  setTitleIndex(s: ReadState, value: number): CaromState;
  setResumeScreen(s: ReadState, value: "countdown" | "playing"): CaromState;
  setScore(s: ReadState, p1: number, p2: number): CaromState;
  setWinner(s: ReadState, value: Side | null): CaromState;
  setReceiver(s: ReadState, value: Side): CaromState;
  setPaddleCy(s: ReadState, side: Side, cy: number): CaromState;
  setPaddleVy(s: ReadState, side: Side, vy: number): CaromState;
  setPaddleDriven(s: ReadState, side: Side, driven: boolean): CaromState;
  setBallPosition(s: ReadState, x: number, y: number): CaromState;
  setBallVelocity(s: ReadState, vx: number, vy: number): CaromState;
  setBallSpin(s: ReadState, spin: number): CaromState;
  setBallHeld(s: ReadState, held: boolean): CaromState;
  setBallHoldTimer(s: ReadState, seconds: number): CaromState;
  setBallServeSign(s: ReadState, sign: 1 | -1): CaromState;
  drawBallServeSign(s: ReadState): CaromState;
  setAiTracking(s: ReadState, enabled: boolean): CaromState;
  setAiMovement(s: ReadState, enabled: boolean): CaromState;
  setMuted(s: ReadState, muted: boolean): CaromState;
  setObstacleClock(s: ReadState, t: number): CaromState;
  setObstacleClockRunning(s: ReadState, running: boolean): CaromState;
  snapshot(s: ReadState): object;
  menuItemRect(s: ReadState, index: number): Rect | null;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const parked = (): BallState => ({
  x: C.FIELD_CX,
  y: C.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: C.HOLD_TIME,
  serveSign: sign(),
  trail: [],
});
const pose = (index: number, t: number): ObstacleState => {
  const center = C.OBSTACLE_CENTERS[index];
  if (!center) throw new Error(`No obstacle ${index}`);
  return {
    index,
    cx: center.x,
    cy:
      center.y +
      (index === 0 ? 1 : -1) *
        C.OBSTACLE_SWAY_AMP *
        Math.sin((2 * Math.PI * t) / C.OBSTACLE_SWAY_PERIOD),
    theta: C.OBSTACLE_SPIN_RATE * t,
  };
};
const initial = (muted: boolean): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: 0,
  titleIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: {
    left: { cy: C.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    right: { cy: C.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
  },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: parked(),
  obstacles: [pose(0, 0), pose(1, 0)],
  obstacleClock: 0,
  obstacleClockRunning: true,
  simTime: 0,
  muted,
  pointerStart: null,
});
const start = (s: ReadState, mode: Mode): CaromState => ({
  ...s,
  screen: "countdown",
  mode,
  resumeScreen: "playing",
  menuIndex: 0,
  score: { p1: 0, p2: 0 },
  winner: null,
  receiver: "left",
  ball: parked(),
  paddles: {
    left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
    right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
  },
  obstacles: s.obstacles.map((o) => pose(o.index, 0)),
  obstacleClock: 0,
  obstacleClockRunning: true,
});
const title = (s: ReadState): CaromState => ({
  ...initial(s.muted),
  titleIndex: s.titleIndex,
  menuIndex: s.titleIndex,
  simTime: s.simTime,
});
const menuCount = (screen: Screen) =>
  screen === "title"
    ? C.TITLE_ITEMS.length
    : screen === "paused"
      ? C.PAUSE_ITEMS.length
      : screen === "matchover"
        ? C.MATCHOVER_ITEMS.length
        : screen === "howto"
          ? 1
          : 0;
const menuRect = (screen: Screen, index: number): Rect | null => {
  if (index < 0 || index >= menuCount(screen)) return null;
  const top =
    screen === "title"
      ? 374
      : screen === "howto"
        ? 585
        : screen === "paused"
          ? 354
          : 414;
  return { x: C.FIELD_CX - 170, y: top + index * 66, w: 340, h: 52 };
};
const ballPose = (s: ReadState, change: Partial<BallState>): CaromState => {
  if (!s.ball) throw new Error("No ball on the field");
  return { ...s, ball: { ...s.ball, ...change } };
};
const paddlePose = (
  s: ReadState,
  side: Side,
  change: Partial<PaddleState>,
): CaromState => ({
  ...s,
  paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...change } },
});
const debugApi = (): CaromDebugApi => ({
  version: C.CAROM_DEBUG_VERSION,
  clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
  spawnBall: (s) => ({ ...s, ball: parked() }),
  spawnObstacle: (s, index) => ({
    ...s,
    obstacles: [
      ...s.obstacles.filter((o) => o.index !== index),
      pose(index, s.obstacleClock),
    ].sort((a, b) => a.index - b.index),
  }),
  reset: (s) => initial(s.muted),
  reconcile: (s) => ({
    ...s,
    obstacles: s.obstacles.map((o) => pose(o.index, s.obstacleClock)),
  }),
  setScreen: (s, screen) => ({ ...s, screen }),
  setMode: (s, mode) => ({ ...s, mode }),
  setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
  setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
  setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
  setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
  setWinner: (s, winner) => ({ ...s, winner }),
  setReceiver: (s, receiver) => ({ ...s, receiver }),
  setPaddleCy: (s, side, cy) => paddlePose(s, side, { cy }),
  setPaddleVy: (s, side, drivenVy) => paddlePose(s, side, { drivenVy }),
  setPaddleDriven: (s, side, driven) => paddlePose(s, side, { driven }),
  setBallPosition: (s, x, y) => ballPose(s, { x, y }),
  setBallVelocity: (s, vx, vy) => ballPose(s, { vx, vy }),
  setBallSpin: (s, spin) => ballPose(s, { spin }),
  setBallHeld: (s, held) => ballPose(s, { held }),
  setBallHoldTimer: (s, holdTimer) => ballPose(s, { holdTimer }),
  setBallServeSign: (s, serveSign) => ballPose(s, { serveSign }),
  drawBallServeSign: (s) => ballPose(s, { serveSign: sign() }),
  setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
  setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
  setMuted: (s, muted) => ({ ...s, muted }),
  setObstacleClock: (s, obstacleClock) => ({
    ...s,
    obstacleClock,
    obstacles: s.obstacles.map((o) => pose(o.index, obstacleClock)),
  }),
  setObstacleClockRunning: (s, obstacleClockRunning) => ({
    ...s,
    obstacleClockRunning,
  }),
  snapshot: (s) => ({
    screen: s.screen,
    mode: s.mode,
    menuIndex: s.menuIndex,
    titleIndex: s.titleIndex,
    resumeScreen: s.resumeScreen,
    winner: s.winner,
    receiver: s.receiver,
    obstacleClock: s.obstacleClock,
    obstacleClockRunning: s.obstacleClockRunning,
    simTime: s.simTime,
    muted: s.muted,
    version: C.CAROM_DEBUG_VERSION,
    paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
    score: { ...s.score },
    ai: { ...s.ai },
    ball: s.ball
      ? {
          ...s.ball,
          speed: Math.hypot(s.ball.vx, s.ball.vy),
          trail: s.ball.trail.map((p) => ({ ...p })),
        }
      : null,
    obstacles: s.obstacles.map((o) => pose(o.index, s.obstacleClock)),
  }),
  menuItemRect: (s, index) => menuRect(s.screen, index),
});
function move(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const cy = clamp(p.cy + vy * dt, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return {
    ...p,
    cy,
    vy: dt > 0 && cy !== p.cy + vy * dt ? (cy - p.cy) / dt : vy,
  };
}
function advancePaddles(
  s: ReadState,
  api: UpdateApi,
  dt: number,
): CaromState["paddles"] {
  const input = api.input;
  const axis = (up: string, down: string) =>
    Number(input.value(down) > 0) - Number(input.value(up) > 0);
  const left = s.paddles.left;
  const right = s.paddles.right;
  const lv = left.driven
    ? left.drivenVy
    : C.PADDLE_SPEED *
      (s.mode === "solo"
        ? Number(input.value("p1-down") > 0 || input.value("p2-down") > 0) -
          Number(input.value("p1-up") > 0 || input.value("p2-up") > 0)
        : axis("p1-up", "p1-down"));
  let rv = right.drivenVy;
  if (!right.driven) {
    if (s.mode === "versus") rv = C.PADDLE_SPEED * axis("p2-up", "p2-down");
    else {
      const tracking =
        s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0;
      const target =
        tracking && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
      const deadzone = tracking ? C.AI_DEADZONE : C.AI_HOME_DEADZONE;
      const diff = target - right.cy;
      rv =
        !s.ai.movement || Math.abs(diff) <= deadzone
          ? 0
          : Math.sign(diff) *
            Math.min(C.AI_SPEED, dt > 0 ? Math.abs(diff) / dt : C.AI_SPEED);
    }
  }
  return { left: move(left, lv, dt), right: move(right, rv, dt) };
}
type Events = { wall: boolean; paddle: boolean; obstacle: boolean };
function collidePaddle(
  b: BallState,
  p: PaddleState,
  x0: number,
  x1: number,
  dir: 1 | -1,
  events: Events,
): BallState {
  const y0 = p.cy - C.PADDLE_HALF,
    y1 = p.cy + C.PADDLE_HALF;
  if (!(
    b.x > x0 - C.BALL_R &&
    b.x < x1 + C.BALL_R &&
    b.y > y0 - C.BALL_R &&
    b.y < y1 + C.BALL_R
  ))
    return b;
  const depths = [
    b.x - (x0 - C.BALL_R),
    x1 + C.BALL_R - b.x,
    b.y - (y0 - C.BALL_R),
    y1 + C.BALL_R - b.y,
  ];
  const face = depths.indexOf(Math.min(...depths));
  if (face < 2) {
    const inward = face === 0 ? b.vx > 0 : b.vx < 0;
    if (!inward) return { ...b, x: face === 0 ? x0 - C.BALL_R : x1 + C.BALL_R };
    const speed = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP);
    const theta =
      clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
    events.paddle = true;
    return {
      ...b,
      x: dir === 1 ? x1 + C.BALL_R : x0 - C.BALL_R,
      vx: dir * speed * Math.cos(theta),
      vy: speed * Math.sin(theta),
      spin: clamp(
        b.spin + p.vy * C.SPIN_FROM_PADDLE,
        -C.SPIN_CLAMP,
        C.SPIN_CLAMP,
      ),
    };
  }
  const inward = face === 2 ? b.vy > 0 : b.vy < 0;
  if (inward) events.wall = true;
  return {
    ...b,
    y: face === 2 ? y0 - C.BALL_R : y1 + C.BALL_R,
    vy: inward ? -b.vy : b.vy,
  };
}
function collideObstacle(
  b: BallState,
  o: ObstacleState,
  events: Events,
): BallState {
  const c = Math.cos(o.theta),
    s = Math.sin(o.theta),
    dx = b.x - o.cx,
    dy = b.y - o.cy;
  const lx = dx * c + dy * s,
    ly = -dx * s + dy * c;
  const qx = clamp(lx, -C.OBSTACLE_HW, C.OBSTACLE_HW),
    qy = clamp(ly, -C.OBSTACLE_HH, C.OBSTACLE_HH);
  const ax = lx - qx,
    ay = ly - qy,
    dist = Math.hypot(ax, ay);
  if (dist >= C.BALL_R) return b;
  let nx: number, ny: number, push: number;
  if (dist > 0) {
    nx = ax / dist;
    ny = ay / dist;
    push = C.BALL_R - dist;
  } else {
    const px = C.OBSTACLE_HW - Math.abs(lx),
      py = C.OBSTACLE_HH - Math.abs(ly);
    nx = px <= py ? (lx >= 0 ? 1 : -1) : 0;
    ny = px <= py ? 0 : ly >= 0 ? 1 : -1;
    push = C.BALL_R + Math.min(px, py);
  }
  const wx = nx * c - ny * s,
    wy = nx * s + ny * c,
    dot = b.vx * wx + b.vy * wy;
  if (dot < 0) events.obstacle = true;
  return {
    ...b,
    x: b.x + wx * push,
    y: b.y + wy * push,
    vx: dot < 0 ? b.vx - 2 * dot * wx : b.vx,
    vy: dot < 0 ? b.vy - 2 * dot * wy : b.vy,
  };
}
function fly(
  ball: DeepReadonly<BallState>,
  s: ReadState,
  paddles: CaromState["paddles"],
  dt: number,
): { ball: BallState; events: Events } {
  const events = { wall: false, paddle: false, obstacle: false };
  let b: BallState = { ...ball, trail: [...ball.trail] };
  const steps = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
    ),
    h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const angle = (b.spin / speed) * h,
        c = Math.cos(angle),
        sn = Math.sin(angle);
      b = { ...b, vx: b.vx * c - b.vy * sn, vy: b.vx * sn + b.vy * c };
    }
    b = {
      ...b,
      spin: b.spin * Math.pow(0.5, h / C.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: C.BALL_R, vy: -b.vy };
      events.wall = true;
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b = { ...b, y: C.FIELD_H - C.BALL_R, vy: -b.vy };
      events.wall = true;
    }
    b = collidePaddle(b, paddles.left, C.P1_X0, C.P1_X1, 1, events);
    b = collidePaddle(b, paddles.right, C.P2_X0, C.P2_X1, -1, events);
    for (const o of s.obstacles) b = collideObstacle(b, o, events);
  }
  return { ball: b, events };
}
function choose(s: ReadState, index: number): CaromState {
  if (s.screen === "title") {
    if (index === 0 || index === 1)
      return start(
        { ...s, titleIndex: index },
        index === 0 ? "solo" : "versus",
      );
    return { ...s, screen: "howto", menuIndex: 0, titleIndex: index };
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return index === 0
      ? { ...s, screen: s.resumeScreen }
      : index === 1
        ? start(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return index === 0 ? start(s, s.mode) : title(s);
  return { ...s };
}
function inputScreen(s: ReadState, api: UpdateApi): CaromState {
  const input = api.input;
  let next: CaromState = { ...s };
  if (input.pressed("mute")) {
    api.audio.setMuted(!api.audio.muted());
    next = { ...next, muted: api.audio.muted() };
  }
  const screen = s.screen;
  if (screen === "countdown" || screen === "playing") {
    if (input.pressed("pause"))
      return { ...next, screen: "paused", resumeScreen: screen, menuIndex: 0 };
    return next;
  }
  if (screen === "paused" && (input.pressed("pause") || input.pressed("back")))
    return { ...next, screen: s.resumeScreen };
  if (screen === "howto" && input.pressed("back")) return title(next);
  if (screen === "matchover" && input.pressed("back")) return title(next);
  const up = input.pressed("p1-up") || input.pressed("p2-up");
  const down = input.pressed("p1-down") || input.pressed("p2-down");
  const moved = up || down;
  if (moved)
    next = {
      ...next,
      menuIndex:
        (next.menuIndex + (up ? -1 : 1) + menuCount(screen)) %
        menuCount(screen),
    };
  const confirm = input.pressed("confirm");
  if (!moved && confirm) return choose(next, next.menuIndex);
  // Samples retain both edges when a click begins and ends in one engine frame.
  for (const sample of input.pointerSamples()) {
    const index = Array.from({ length: menuCount(screen) }, (_, i) => i).find(
      (i) => {
        const r = menuRect(screen, i)!;
        return (
          sample.x >= r.x &&
          sample.x <= r.x + r.w &&
          sample.y >= r.y &&
          sample.y <= r.y + r.h
        );
      },
    );
    if (index !== undefined) next = { ...next, menuIndex: index };
    if (sample.type === "down" && sample.button === "primary")
      next = {
        ...next,
        pointerStart: index === undefined ? null : { id: sample.id, index },
      };
    if (sample.type === "up") {
      const matches =
        next.pointerStart?.id === sample.id &&
        next.pointerStart.index === index;
      next = { ...next, pointerStart: null };
      if (matches && index !== undefined && !confirm)
        return choose(next, index);
    }
  }
  const pointer = input.pointer();
  const hover = Array.from({ length: menuCount(screen) }, (_, i) => i).find(
    (i) => {
      const r = menuRect(screen, i)!;
      return (
        pointer.x >= r.x &&
        pointer.x <= r.x + r.w &&
        pointer.y >= r.y &&
        pointer.y <= r.y + r.h
      );
    },
  );
  if (hover !== undefined && !confirm) next = { ...next, menuIndex: hover };
  return next;
}
export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api) {
    for (const name of C.ACTIONS)
      api.input.register(name, { keys: [...C.BINDINGS[name]] });
    api.audio.define(C.CUES.paddleHit, {
      wave: "triangle",
      freq: 540,
      freqTo: 240,
      durationMs: 95,
      gain: 0.18,
    });
    api.audio.define(C.CUES.wallBounce, {
      wave: "sine",
      freq: 390,
      freqTo: 290,
      durationMs: 65,
      gain: 0.12,
    });
    api.audio.define(C.CUES.obstacleBounce, {
      wave: "square",
      freq: 280,
      freqTo: 470,
      durationMs: 90,
      gain: 0.09,
    });
    api.audio.define(C.CUES.score, {
      wave: "triangle",
      freq: 740,
      freqTo: 180,
      durationMs: 280,
      gain: 0.19,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
    api.diagnostics.register("ball", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    api.diagnostics.register("velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    api.diagnostics.register("speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy).toFixed(1) : "none",
    );
    api.diagnostics.register("spin", (s) =>
      s.ball ? s.ball.spin.toFixed(1) : "none",
    );
    api.diagnostics.register(
      "left",
      (s) => `${s.paddles.left.cy.toFixed(1)}, ${s.paddles.left.vy.toFixed(1)}`,
    );
    api.diagnostics.register(
      "right",
      (s) =>
        `${s.paddles.right.cy.toFixed(1)}, ${s.paddles.right.vy.toFixed(1)}`,
    );
    return [initial(false), debugApi()];
  },
  update(state, api, dt) {
    if (state.muted !== api.audio.muted()) api.audio.setMuted(state.muted);
    const nextInput = inputScreen(state, api);
    const next: CaromState = {
      ...nextInput,
      simTime: state.simTime + dt,
      muted: api.audio.muted(),
    };
    if (next.screen !== "countdown" && next.screen !== "playing") return next;
    const paddles = advancePaddles(next, api, dt);
    let ball = next.ball;
    let screen: Screen = next.screen;
    let score = next.score,
      winner = next.winner,
      receiver = next.receiver,
      menuIndex = next.menuIndex;
    if (ball && screen === "countdown") {
      const holdTimer = ball.holdTimer - dt;
      if (holdTimer <= 0) {
        const dir = receiver === "left" ? -1 : 1;
        ball = {
          ...ball,
          held: false,
          holdTimer: 0,
          vx: dir * C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
          vy: ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
          trail: [],
        };
        screen = "playing";
      } else ball = { ...ball, holdTimer };
    } else if (ball && screen === "playing" && !ball.held) {
      const stepped = fly(ball, next, paddles, dt);
      ball = stepped.ball;
      if (stepped.events.wall) api.audio.play(C.CUES.wallBounce);
      if (stepped.events.paddle) api.audio.play(C.CUES.paddleHit);
      if (stepped.events.obstacle) api.audio.play(C.CUES.obstacleBounce);
      let scorer: Side | null = null;
      if (ball.x - C.BALL_R > C.FIELD_W) scorer = "left";
      else if (ball.x + C.BALL_R < 0) scorer = "right";
      if (scorer) {
        api.audio.play(C.CUES.score);
        score = {
          p1: score.p1 + Number(scorer === "left"),
          p2: score.p2 + Number(scorer === "right"),
        };
        if (
          (score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD) ||
          (score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD)
        ) {
          winner = scorer;
          screen = "matchover";
          menuIndex = 0;
        } else {
          ball = parked();
          receiver = scorer === "left" ? "right" : "left";
          screen = "countdown";
        }
      }
    }
    if (ball && (screen === "playing" || screen === "countdown"))
      ball = {
        ...ball,
        trail: [
          ...ball.trail,
          { x: ball.x, y: ball.y, t: next.simTime },
        ].filter((p) => p.t >= next.simTime - C.TRAIL_TIME),
      };
    const obstacleClock =
      next.obstacleClock + (next.obstacleClockRunning ? dt : 0);
    return {
      ...next,
      paddles,
      ball,
      screen,
      score,
      winner,
      receiver,
      menuIndex,
      obstacleClock,
      obstacles: next.obstacles.map((o) => pose(o.index, obstacleClock)),
    };
  },
  render(state, api) {
    renderGame(state, api.ctx);
  },
};

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 600,
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}
function menu(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  index: number,
  items: readonly string[],
): void {
  items.forEach((item, i) => {
    const r = menuRect(screen, i)!;
    rounded(ctx, r.x, r.y, r.w, r.h, 12, i === index ? "#e9f8fc" : "#1e3043");
    text(
      ctx,
      item,
      C.FIELD_CX,
      r.y + r.h / 2,
      20,
      i === index ? "#102339" : "#d8eaf2",
      700,
    );
  });
}
function renderGame(s: ReadState, ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.strokeStyle = "#1b3142";
  ctx.lineWidth = 1;
  for (let x = 80; x < C.FIELD_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.FIELD_H);
    ctx.stroke();
  }
  for (let y = 80; y < C.FIELD_H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.FIELD_W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#37536a";
  ctx.setLineDash([10, 16]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.NET_X, 26);
  ctx.lineTo(C.NET_X, C.FIELD_H - 26);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    ctx.shadowColor = "#f6ac62";
    ctx.shadowBlur = 18;
    rounded(
      ctx,
      -C.OBSTACLE_HW,
      -C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      9,
      "#f0a85b",
    );
    ctx.restore();
  }
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#41d9e3";
  rounded(
    ctx,
    C.P1_X0,
    s.paddles.left.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    8,
    "#53dce6",
  );
  ctx.shadowColor = "#ff648a";
  rounded(
    ctx,
    C.P2_X0,
    s.paddles.right.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    8,
    "#fb648a",
  );
  ctx.shadowBlur = 0;
  if (s.ball) {
    const trail = s.ball.trail;
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (const p of trail.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "#d1eef6";
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#fff8dd";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, C.BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (
    s.screen === "playing" ||
    s.screen === "countdown" ||
    s.screen === "paused" ||
    s.screen === "matchover"
  ) {
    text(ctx, String(s.score.p1), C.FIELD_CX - 105, 69, 54, "#53dce6", 800);
    text(ctx, String(s.score.p2), C.FIELD_CX + 105, 69, 54, "#fb648a", 800);
    text(
      ctx,
      s.mode === "solo" ? "SOLO  ·  VS AI" : "VERSUS  ·  LOCAL",
      C.FIELD_CX,
      C.FIELD_H - 35,
      16,
      "#86a5b8",
      700,
    );
  }
  if (s.screen === "countdown") {
    text(ctx, "READY", C.FIELD_CX, 270, 42, "#e9f8fc", 800);
    text(
      ctx,
      String(Math.max(1, Math.ceil(s.ball?.holdTimer ?? 0))),
      C.FIELD_CX,
      455,
      46,
      "#f0a85b",
      800,
    );
  }
  if (s.screen === "title") {
    rounded(ctx, 350, 100, 580, 555, 26, "#101f30eb");
    text(ctx, "CAROM", C.FIELD_CX, 208, 88, "#f3f5df", 900);
    text(ctx, "CURVE THE RALLY", C.FIELD_CX, 279, 18, "#66dce4", 700);
    menu(ctx, "title", s.menuIndex, C.TITLE_ITEMS);
    text(ctx, "W / S   ·   ↑ / ↓   ·   ENTER", C.FIELD_CX, 610, 15, "#8ea9b8");
  }
  if (s.screen === "howto") {
    rounded(ctx, 280, 72, 720, 590, 26, "#101f30f2");
    text(ctx, "HOW TO PLAY", C.FIELD_CX, 145, 52, "#f3f5df", 800);
    text(ctx, "W / S  move left paddle", C.FIELD_CX, 260, 24, "#53dce6");
    text(ctx, "↑ / ↓  move right paddle", C.FIELD_CX, 307, 24, "#fb648a");
    text(
      ctx,
      "Move at impact to curve the ball.",
      C.FIELD_CX,
      385,
      23,
      "#f3f5df",
    );
    text(
      ctx,
      "Bank shots off the rotating obstacles.",
      C.FIELD_CX,
      427,
      23,
      "#f3f5df",
    );
    text(ctx, "P or ESC pause    ·    M mute", C.FIELD_CX, 492, 18, "#8ea9b8");
    menu(ctx, "howto", s.menuIndex, ["BACK"]);
  }
  if (s.screen === "paused" || s.screen === "matchover") {
    rounded(ctx, 365, 190, 550, 430, 26, "#101f30f2");
    text(
      ctx,
      s.screen === "paused"
        ? "PAUSED"
        : s.winner === "left"
          ? "PLAYER ONE WINS"
          : "PLAYER TWO WINS",
      C.FIELD_CX,
      275,
      s.screen === "paused" ? 52 : 38,
      "#f3f5df",
      800,
    );
    if (s.screen === "matchover")
      text(
        ctx,
        `${s.score.p1}  —  ${s.score.p2}`,
        C.FIELD_CX,
        340,
        26,
        "#aec5cf",
      );
    menu(
      ctx,
      s.screen,
      s.menuIndex,
      s.screen === "paused" ? C.PAUSE_ITEMS : C.MATCHOVER_ITEMS,
    );
  }
  text(
    ctx,
    s.muted ? "SOUND OFF  ·  M" : "M  ·  SOUND",
    112,
    C.FIELD_H - 34,
    13,
    "#657f8f",
  );
}
