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
import { getApprovedListingIds, createProfileMedia, getMyProfile, getProfileMedia } from "../db";
import { buildSitemapXml } from "./sitemap";
import { storagePut } from "../storage";
import { getProfileMediaKind, hasProfileMediaAttestation, hasValidProfileMediaSignature, MAX_PROFILE_MEDIA_BYTES } from "../mediaRules";

function isPortAvailable(port: number): Promise<boolean> { return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => { server.close(() => resolve(true)); }); server.on("error", () => resolve(false)); }); }
async function findAvailablePort(startPort: number = 3000): Promise<number> { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error(`No available port found starting from ${startPort}`); }
function originFor(req: express.Request) { return `${req.protocol}://${req.get("host")}`; }

async function startServer() {
  const app = express(); const server = createServer(app);
  app.use(express.json({ limit: "50mb" })); app.use(express.urlencoded({ limit: "50mb", extended: true })); registerStorageProxy(app); registerOAuthRoutes(app);
  app.get("/healthz", (_req, res) => { res.status(200).json({ status: "ok" }); });
  app.post("/api/profile-media", express.raw({ type: ["image/*", "video/*"], limit: "25mb" }), async (req, res) => { try { res.set("X-Content-Type-Options", "nosniff"); const ctx = await createContext({ req, res } as Parameters<typeof createContext>[0]); if (!ctx.user) return res.status(401).json({ error: "Sign in to upload profile media." }); if (!hasProfileMediaAttestation(req.headers["x-profile-media-attestation"])) return res.status(400).json({ error: "Confirm that you own this watermark-free media or have permission to publish it." }); const mimeType = req.headers["content-type"]?.split(";")[0].trim() || ""; const mediaInfo = getProfileMediaKind(mimeType); if (!mediaInfo) return res.status(415).json({ error: "Use a JPG, PNG, WebP, GIF, MP4, or WebM file." }); if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Choose a file to upload." }); if (req.body.length > MAX_PROFILE_MEDIA_BYTES) return res.status(413).json({ error: "Each file must be 25 MB or smaller." }); if (!hasValidProfileMediaSignature(mimeType, req.body)) return res.status(415).json({ error: "The selected file does not match its declared media type." }); const [profile, existingMedia] = await Promise.all([getMyProfile(ctx.user.id), getProfileMedia(ctx.user.id)]); if (!profile) return res.status(412).json({ error: "Complete your profile before adding media." }); if (existingMedia.length >= 8) return res.status(409).json({ error: "A profile can contain up to 8 photos and videos." }); const stored = await storagePut(`profile-media/${ctx.user.id}/${Date.now()}.${mediaInfo.extension}`, req.body, mimeType); const media = await createProfileMedia({ userId: ctx.user.id, storageKey: stored.key, url: stored.url, mediaType: mediaInfo.mediaType, mimeType }); return res.status(201).json({ media }); } catch (error) { const message = error instanceof Error ? error.message : "Upload failed."; return res.status(400).json({ error: message }); } });
  app.get("/robots.txt", (req, res) => { const origin = originFor(req); res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /profile\nDisallow: /post\nDisallow: /inbox\nDisallow: /report/\nDisallow: /studio\n\nSitemap: ${origin}/sitemap.xml\n`); });
  app.get("/sitemap.xml", async (req, res) => { const listings = await getApprovedListingIds(); res.type("application/xml").send(buildSitemapXml(originFor(req), listings.map(listing => listing.id))); });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") await setupVite(app, server); else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000"); const port = await findAvailablePort(preferredPort); const host = process.env.HOST || "0.0.0.0"; if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`); server.listen(port, host, () => console.log(`Server running on http://${host}:${port}/`));
}
startServer().catch(console.error);
