import type { Express } from "express";
import path from "node:path";
import { ENV } from "./env";

export function isSafeStorageKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  if (key.includes("\0")) return false;

  let decodedKey: string;
  try {
    decodedKey = decodeURIComponent(key);
  } catch {
    return false;
  }

  if (decodedKey.includes("\0")) return false;

  const segments = decodedKey.split(/[/\\]/);
  for (const segment of segments) {
    if (segment === "..") return false;
  }

  const normalized = path.posix.normalize(decodedKey);
  if (normalized.startsWith("..") || normalized === "." || normalized.includes("\0")) {
    return false;
  }

  return true;
}

export function registerStorageProxy(app: Express) {
  app.get("/storage/*", async (req, res) => {
    const rawKey = (req.params as Record<string, string>)[0];
    if (!rawKey || !isSafeStorageKey(rawKey)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    const key = path.posix.normalize(decodeURIComponent(rawKey));

    if (!ENV.serviceApiUrl || !ENV.serviceApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const storageUrl = new URL(
        "v1/storage/presign/get",
        ENV.serviceApiUrl.replace(/\/+$/, "") + "/",
      );
      storageUrl.searchParams.set("path", key);

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
