import { describe, expect, it } from "vitest";
import { nextRateLimitState } from "./platformControls";

describe("durable action-limit state", () => {
  it("rejects an action once the persisted window count reaches its maximum", () => {
    const result = nextRateLimitState({ existing: { actionCount: 3, windowStartedAt: new Date(1_000) }, maximum: 3, now: new Date(5_000), windowMs: 60_000 });
    expect(result.allowed).toBe(false);
  });

  it("resets the persisted count when the action window has expired", () => {
    const result = nextRateLimitState({ existing: { actionCount: 20, windowStartedAt: new Date(1_000) }, maximum: 20, now: new Date(61_001), windowMs: 60_000 });
    expect(result).toMatchObject({ allowed: true, actionCount: 1, windowStartedAt: new Date(61_001) });
  });

  it("limits upload actions when window limit is reached", () => {
    const existing = { actionCount: 10, windowStartedAt: new Date(1_000) };
    const result = nextRateLimitState({ existing, maximum: 10, now: new Date(5_000), windowMs: 60 * 60 * 1000 });
    expect(result.allowed).toBe(false);
  });
});
