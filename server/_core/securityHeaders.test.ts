import { describe, expect, it } from "vitest";
import express from "express";
import type { AddressInfo } from "net";

function createTestApp() {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.get("/test", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("Security Headers Middleware", () => {
  it("includes security headers on HTTP responses", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/test`;

    try {
      const res = await fetch(url);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    } finally {
      server.close();
    }
  });
});
