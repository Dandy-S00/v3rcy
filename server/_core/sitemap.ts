export function buildSitemapXml(origin: string, listingIds: number[]) {
  const publicPaths = ["/", "/browse", "/guides", "/safety"];
  const staticUrls = publicPaths
    .map(
      path =>
        `<url><loc>${origin}${path}</loc><changefreq>weekly</changefreq><priority>${path === "/" ? "1.0" : path === "/browse" ? "0.8" : path === "/guides" ? "0.7" : "0.6"}</priority></url>`
    )
    .join("");
  const listingUrls = listingIds
    .map(
      id =>
        `<url><loc>${origin}/listing/${id}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${listingUrls}</urlset>`;
}
