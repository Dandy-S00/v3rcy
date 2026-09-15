import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { injectRouteSeo } from "./seo";

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });
  app.use(async (req, res, next) => {
    if (!req.headers.accept?.includes("text/html")) return next();
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      template = await injectRouteSeo(
        await vite.transformIndexHtml(req.originalUrl, template),
        req.path
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
  app.use(vite.middlewares);
}
export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  app.use(express.static(distPath, { index: false }));
  app.use("*", async (req, res) => {
    const template = await fs.promises.readFile(
      path.resolve(distPath, "index.html"),
      "utf-8"
    );
    res
      .status(200)
      .type("html")
      .end(await injectRouteSeo(template, req.path));
  });
}
