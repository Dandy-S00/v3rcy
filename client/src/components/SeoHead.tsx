import { useEffect } from "react";
import { useLocation } from "wouter";

const base = {
  title: "v3rya — Private connections, thoughtfully held",
  description:
    "v3rya is a private, adult-only platform for thoughtful connections, local discovery, and unhurried conversation.",
};
const publicMeta: Record<string, { title: string; description: string }> = {
  "/": base,
  "/browse": {
    title: "Browse local connections | v3rya",
    description:
      "Explore adult-only local listings and discover people, plans, and possibilities at your own pace.",
  },
  "/safety": {
    title: "Safety information | v3rya",
    description:
      "Learn how v3rya supports privacy, reporting, and thoughtful adult-only connections.",
  },
};
const privatePrefixes = ["/profile", "/post", "/inbox", "/report", "/studio"];

function setMeta(
  selector: string,
  attribute: "name" | "property",
  key: string,
  content: string
) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

export default function SeoHead() {
  const [location] = useLocation();
  useEffect(() => {
    const match = publicMeta[location] ?? base;
    const noindex = privatePrefixes.some(
      prefix => location === prefix || location.startsWith(`${prefix}/`)
    );
    document.title = match.title;
    setMeta(
      'meta[name="description"]',
      "name",
      "description",
      match.description
    );
    setMeta('meta[property="og:title"]', "property", "og:title", match.title);
    setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      match.description
    );
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", match.title);
    setMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      match.description
    );
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noindex ? "noindex,follow" : "index,follow,max-image-preview:large"
    );
  }, [location]);
  return null;
}
