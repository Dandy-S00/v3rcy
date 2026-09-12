import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getApprovedListingIds, createProfileMedia, getMyProfile, getProfileMedia, getDb } from "../db";
import { buildSitemapXml } from "./sitemap";
import { storagePut } from "../storage";
import { getProfileMediaKind, hasProfileMediaAttestation, hasValidProfileMediaSignature, MAX_PROFILE_MEDIA_BYTES } from "../mediaRules";
import { sql } from "drizzle-orm";

function isPortAvailable(port: number): Promise<boolean> { return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => { server.close(() => resolve(true)); }); server.on("error", () => resolve(false)); }); }
async function findAvailablePort(startPort: number = 3000): Promise<number> { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error(`No available port found starting from ${startPort}`); }
async function isDatabaseHealthy(): Promise<boolean> { try { const db = await getDb(); if (!db) return false; await db.execute(sql`SELECT 1`); return true; } catch { return false; } }
function originFor(req: express.Request) { return `${req.protocol}://${req.get("host")}`; }

async function startServer() {
  const app = express(); const server = createServer(app);
  app.use(express.json({ limit: "50mb" })); app.use(express.urlencoded({ limit: "50mb", extended: true })); registerStorageProxy(app); registerOAuthRoutes(app);
  app.get("/healthz", async (_req, res) => { const dbHealthy = await isDatabaseHealthy(); return res.status(dbHealthy ? 200 : 503).json({ status: dbHealthy ? "ok" : "degraded", database: dbHealthy ? "connected" : "unavailable" }); });
  app.get("/readyz", async (_req, res) => { const dbHealthy = await isDatabaseHealthy(); return res.status(dbHealthy ? 200 : 503).json({ status: dbHealthy ? "ready" : "not_ready", database: dbHealthy ? "connected" : "unavailable" }); });
  app.post("/api/profile-media", express.raw({ type: ["image/*", "video/*"], limit: "25mb" }), async (req, res) => { try { res.set("X-Content-Type-Options", "nosniff"); const ctx = await createContext({ req, res } as Parameters<typeof createContext>[0]); if (!ctx.user) return res.status(401).json({ error: "Sign in to upload profile media." }); if (!hasProfileMediaAttestation(req.headers["x-profile-media-attestation"])) return res.status(400).json({ error: "Confirm that you own this watermark-free media or have permission to publish it." }); const mimeType = req.headers["content-type"]?.split(";")[0].trim() || ""; const mediaInfo = getProfileMediaKind(mimeType); if (!mediaInfo) return res.status(415).json({ error: "Use a JPG, PNG, WebP, GIF, MP4, or WebM file." }); if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Choose a file to upload." }); if (req.body.length > MAX_PROFILE_MEDIA_BYTES) return res.status(413).json({ error: "Each file must be 25 MB or smaller." }); if (!hasValidProfileMediaSignature(mimeType, req.body)) return res.status(415).json({ error: "The selected file does not match its declared media type." }); const [profile, existingMedia] = await Promise.all([getMyProfile(ctx.user.id), getProfileMedia(ctx.user.id)]); if (!profile) return res.status(412).json({ error: "Complete your profile before adding media." }); if (existingMedia.length >= 8) return res.status(409).json({ error: "A profile can contain up to 8 photos and videos." }); const stored = await storagePut(`profile-media/${ctx.user.id}/${Date.now()}.${mediaInfo.extension}`, req.body, mimeType); const media = await createProfileMedia({ userId: ctx.user.id, storageKey: stored.key, url: stored.url, mediaType: mediaInfo.mediaType, mimeType }); return res.status(201).json({ media }); } catch (error) { console.error("[Profile Media Upload Error]", error); return res.status(500).json({ error: "Media upload failed. Please try again." }); } });
  app.get("/robots.txt", (req, res) => { const origin = originFor(req); res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /profile\nDisallow: /post\nDisallow: /inbox\nDisallow: /report/\nDisallow: /studio\n\nSitemap: ${origin}/sitemap.xml\n`); });
  app.get("/sitemap.xml", async (req, res) => { const listings = await getApprovedListingIds(); res.type("application/xml").send(buildSitemapXml(originFor(req), listings.map(listing => listing.id))); });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") await setupVite(app, server); else serveStatic(app);
  const preferredPort = Number.parseInt(process.env.PORT || "3000", 10); const host = process.env.HOST || "0.0.0.0"; const useFixedPort = process.env.NODE_ENV === "production"; const port = useFixedPort ? preferredPort : await findAvailablePort(preferredPort); if (useFixedPort) { const available = await isPortAvailable(preferredPort); if (!available) throw new Error(`PORT ${preferredPort} is already in use and production mode requires the configured port.`); } else if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`); server.listen(port, host, () => console.log(`Server running on http://${host}:${port}/`));
}
startServer().catch(console.error);
