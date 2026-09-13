import { describe, expect, it, vi } from "vitest";
import express from "express";
import { registerStorageProxy } from "./storageProxy";
import { ENV } from "./env";

function createMockReqRes(pathParam: string) {
  const req = {
    params: { "0": pathParam },
  } as unknown as express.Request;

  const res = {
    statusCode: 200,
    body: "",
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(msg: string) {
      this.body = msg;
      return this;
    },
    set(key: string, val: string) {
      this.headers[key] = val;
      return this;
    },
    redirect(code: number, url: string) {
      this.statusCode = code;
      this.headers["location"] = url;
      return this;
    },
  } as unknown as express.Response & { statusCode: number; body: string; headers: Record<string, string> };

  return { req, res };
}

describe("storageProxy path validation", () => {
  it("rejects path traversal attempts with 400 Bad Request", async () => {
    let handler: (req: express.Request, res: express.Response) => Promise<void> = async () => {};
    const app = {
      get: (_path: string, fn: any) => {
        handler = fn;
      },
    } as unknown as express.Express;

    registerStorageProxy(app);

    const { req: req1, res: res1 } = createMockReqRes("../secret.txt");
    await handler(req1, res1);
    expect(res1.statusCode).toBe(400);
    expect(res1.body).toBe("Invalid storage key");

    const { req: req2, res: res2 } = createMockReqRes("profile-media/1/../../secret.txt");
    await handler(req2, res2);
    expect(res2.statusCode).toBe(400);
    expect(res2.body).toBe("Invalid storage key");
  });

  it("handles valid storage keys", async () => {
    ENV.serviceApiUrl = "https://example.com/api";
    ENV.serviceApiKey = "test-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://s3.example.com/presigned-url" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    let handler: (req: express.Request, res: express.Response) => Promise<void> = async () => {};
    const app = {
      get: (_path: string, fn: any) => {
        handler = fn;
      },
    } as unknown as express.Express;

    registerStorageProxy(app);

    const { req, res } = createMockReqRes("profile-media/1/photo.jpg");
    await handler(req, res);

    expect(res.statusCode).toBe(307);
    expect(res.headers["location"]).toBe("https://s3.example.com/presigned-url");

    fetchSpy.mockRestore();
  });
});
