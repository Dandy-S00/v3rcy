import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getApprovedListing: vi.fn() }));
vi.mock("../db", () => ({ getApprovedListing: mocks.getApprovedListing }));
import { injectRouteSeo } from "./seo";

const template =
  "<html><head><!--route-head--></head><body><noscript><main><!--route-noscript--></main></noscript></body></html>";

describe("injectRouteSeo", () => {
  beforeEach(() => mocks.getApprovedListing.mockReset());
  it("indexes a live approved listing with detail metadata", async () => {
    mocks.getApprovedListing.mockResolvedValue({
      id: 42,
      title: "Evening plans",
      description:
        "A thoughtful, city-level listing for an unhurried introduction.",
      category: "social",
      city: "Austin",
    });
    const result = await injectRouteSeo(template, "/listing/42");
    expect(result).toContain("<title>Evening plans | v3rya</title>");
    expect(result).toContain(
      'name="robots" content="index,follow,max-image-preview:large"'
    );
    expect(result).toContain("A thoughtful, city-level listing");
  });
  it("keeps a missing listing detail route out of the index", async () => {
    mocks.getApprovedListing.mockResolvedValue(undefined);
    const result = await injectRouteSeo(template, "/listing/42");
    expect(result).toContain('name="robots" content="noindex,follow"');
  });
});
