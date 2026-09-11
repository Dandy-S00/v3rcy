import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import { registerStorageProxy } from "./storageProxy";
import { ENV } from "./env";

vi.mock("./env", () => ({
  ENV: {
    serviceApiUrl: "http://storage.internal",
    serviceApiKey: "test-api-key",
  },
}));

describe("storageProxy path traversal protection", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    registerStorageProxy(app);
  });

  const makeMockRes = () => {
    const res: any = {};
    res.statusCode = 200;
    res.status = vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.send = vi.fn().mockReturnValue(res);
    res.set = vi.fn().mockReturnValue(res);
    res.redirect = vi.fn().mockReturnValue(res);
    return res;
  };

  it("rejects path traversal attempts with '..'", async () => {
    const routeHandler = (app as any)._router.stack.find((layer: any) => layer.route?.path === "/storage/*").route.stack[0].handle;

    const req: any = { params: { "0": "../etc/passwd" } };
    const res = makeMockRes();

    await routeHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Invalid storage key");
  });

  it("rejects encoded path traversal attempts", async () => {
    const routeHandler = (app as any)._router.stack.find((layer: any) => layer.route?.path === "/storage/*").route.stack[0].handle;

    const req: any = { params: { "0": "foo/..%2f..%2fsecret.txt" } };
    const res = makeMockRes();

    await routeHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Invalid storage key");
  });

  it("rejects null byte injection in key", async () => {
    const routeHandler = (app as any)._router.stack.find((layer: any) => layer.route?.path === "/storage/*").route.stack[0].handle;

    const req: any = { params: { "0": "valid/key.png\0.php" } };
    const res = makeMockRes();

    await routeHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Invalid storage key");
  });
});
