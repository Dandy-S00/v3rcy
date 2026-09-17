import type { Express } from "express";
import path from "path";
import { ENV } from "./env";

export function isValidStorageKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  if (key.includes("\0") || key.includes("..")) return false;
  if (key.startsWith("/") || key.startsWith("\\")) return false;
  return /^[a-zA-Z0-9_\-\./]+$/.test(key);
}

export function registerStorageProxy(app: Express) {
  app.get("/storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || !isValidStorageKey(key)) {
      res.status(400).send("Invalid or missing storage key");
      return;
    }

    let decodedKey = key;
    try {
      while (decodedKey.includes("%")) {
        const next = decodeURIComponent(decodedKey);
        if (next === decodedKey) break;
        decodedKey = next;
      }
    } catch {
      res.status(400).send("Invalid storage key");
      return;
    }

    const normalizedKey = path.normalize(decodedKey).replace(/^(\.\.[\/\\])+/, "");
    if (
      key.includes("\0") ||
      decodedKey.includes("\0") ||
      key.includes("..") ||
      decodedKey.includes("..") ||
      normalizedKey.startsWith("..") ||
      path.isAbsolute(key) ||
      path.isAbsolute(decodedKey)
    ) {
      res.status(400).send("Invalid storage key");
      return;
    }

    let decodedKey = rawKey;
    try {
      decodedKey = decodeURIComponent(rawKey);
    } catch {
      res.status(400).send("Invalid storage key encoding");
      return;
    }

    if (decodedKey.includes("\0")) {
      res.status(400).send("Invalid storage key");
      return;
    }

    const normalizedKey = path.posix.normalize(decodedKey).replace(/^(\/|\\)+/, "");
    if (normalizedKey.startsWith("..") || normalizedKey.includes("../") || normalizedKey === "..") {
      res.status(400).send("Invalid storage key");
      return;
    }

    if (!ENV.serviceApiUrl || !ENV.serviceApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const storageUrl = new URL(
        "v1/storage/presign/get",
        ENV.serviceApiUrl.replace(/\/+$/, "") + "/",
      );
      storageUrl.searchParams.set("path", normalizedKey);

      const storageResp = await fetch(storageUrl, {
        headers: { Authorization: `Bearer ${ENV.serviceApiKey}` },
      });

      if (!storageResp.ok) {
        const body = await storageResp.text().catch(() => "");
        console.error(`[StorageProxy] backend error: ${storageResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await storageResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
