import { describe, expect, it } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import { game, type CaromState, type CaromDebugApi } from "./game";
import * as C from "./constants";

function rig() {
  let mute = false;
  const sounds: string[] = [];
  const registrations: string[] = [];
  const init = {
    input: { register: (name: string) => registrations.push(name) },
    audio: { define: () => undefined },
    diagnostics: { register: () => undefined },
  } as unknown as InitApi<CaromState>;
  const [state, debug] = game.initialize(init) as [CaromState, CaromDebugApi];
  const held = new Set<string>();
  const edges = new Set<string>();
  const api = {
    input: {
      value: (name: string) => Number(held.has(name)),
      pressed: (name: string) => {
        const yes = edges.has(name);
        edges.delete(name);
        return yes;
      },
      pointerSamples: () => [],
      pointer: () => ({
        x: 0,
        y: 0,
        down: false,
        device: "mouse",
        buttons: [],
      }),
    },
    audio: {
      muted: () => mute,
      setMuted: (value: boolean) => {
        mute = value;
      },
      play: (cue: string) => sounds.push(cue),
    },
  } as unknown as UpdateApi;
  return { state, debug, api, held, edges, sounds, registrations };
}

describe("Carom simulation", () => {
  it("registers all actions and begins with a complete held world", () => {
    const r = rig();
    expect(r.registrations).toEqual(C.ACTIONS);
    expect(r.debug.snapshot(r.state)).toMatchObject({
      screen: "title",
      score: { p1: 0, p2: 0 },
      ball: { held: true, holdTimer: C.HOLD_TIME },
      obstacles: [{ index: 0 }, { index: 1 }],
    });
  });
  it("serves on the countdown expiration frame without moving the ball", () => {
    const r = rig();
    let s = r.debug.setScreen(r.state, "countdown");
    s = r.debug.setBallServeSign(s, 1);
    s = game.update(s, r.api, C.HOLD_TIME);
    expect(s.screen).toBe("playing");
    expect(s.ball?.held).toBe(false);
    expect(s.ball?.x).toBe(C.FIELD_CX);
    expect(s.ball?.vx).toBeCloseTo(-C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE));
  });
  it("uses actual clamped paddle velocity for spin", () => {
    const r = rig();
    let s = r.debug.setScreen(r.state, "playing");
    s = r.debug.clearWorld(s);
    s = r.debug.spawnBall(s);
    s = r.debug.setPaddleDriven(s, "left", true);
    s = r.debug.setPaddleVy(s, "left", C.PADDLE_SPEED);
    s = r.debug.setBallHeld(s, false);
    s = r.debug.setBallPosition(s, C.P1_X1 + C.BALL_R + 2, C.FIELD_CY);
    s = r.debug.setBallVelocity(s, -C.SERVE_SPEED, 0);
    s = game.update(s, r.api, 0.01);
    expect(s.ball?.vx).toBeGreaterThan(0);
    expect(s.ball?.spin).toBeGreaterThan(0);
    expect(r.sounds).toContain(C.CUES.paddleHit);
  });
  it("scores, parks, and sends the next serve toward the loser", () => {
    const r = rig();
    let s = r.debug.setScreen(r.state, "playing");
    s = r.debug.clearWorld(s);
    s = r.debug.spawnBall(s);
    s = r.debug.setBallHeld(s, false);
    s = r.debug.setBallPosition(s, C.FIELD_W + C.BALL_R + 1, 350);
    s = r.debug.setBallVelocity(s, 100, 0);
    s = game.update(s, r.api, 0.01);
    expect(s.score).toEqual({ p1: 1, p2: 0 });
    expect(s.receiver).toBe("right");
    expect(s.screen).toBe("countdown");
    expect(s.ball?.held).toBe(true);
  });
  it("freezes play behind pause and resumes with one Escape edge", () => {
    const r = rig();
    let s = r.debug.setScreen(r.state, "playing");
    r.edges.add("pause");
    s = game.update(s, r.api, 0.1);
    expect(s.screen).toBe("paused");
    const clock = s.obstacleClock;
    s = game.update(s, r.api, 0.1);
    expect(s.obstacleClock).toBe(clock);
    r.edges.add("pause");
    r.edges.add("back");
    s = game.update(s, r.api, 0.01);
    expect(s.screen).toBe("playing");
  });
});
