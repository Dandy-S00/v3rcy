import { ArrowLeft, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import VerificationBadge from "@/components/VerificationBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function ListingDetail() {
  const [location, go] = useLocation();
  const id = Number(location.split("/").pop());
  const listing = trpc.listings.get.useQuery(
    { listingId: id },
    { enabled: Number.isInteger(id) && id > 0 }
  );
  useEffect(() => {
    if (!listing.data) return;
    document.title = `${listing.data.title} | v3rya`;
    const description = listing.data.description.slice(0, 160);
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", `${listing.data.title} | v3rya`);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", description);
  }, [listing.data]);
  if (listing.isLoading)
    return (
      <div className="min-h-screen bg-[#080d1d] text-white">
        <SiteHeader />
        <main className="container py-20 text-slate-400">Loading listing…</main>
      </div>
    );
  if (!listing.data)
    return (
      <div className="min-h-screen bg-[#080d1d] text-white">
        <SiteHeader />
        <main className="container py-20">
          <h1 className="font-serif text-4xl">This listing is unavailable.</h1>
          <Button
            onClick={() => go("/browse")}
            className="mt-6 rounded-xl bg-[#e1c687] text-[#10172c]"
          >
            Browse listings
          </Button>
        </main>
      </div>
    );
  const item = listing.data;
  return (
    <div className="min-h-screen bg-[#080d1d] text-white">
      <SiteHeader />
      <main className="container max-w-4xl py-10 sm:py-16">
        <button
          onClick={() => go("/browse")}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#e1c687]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to browse
        </button>
        <article className="mt-7 rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-7 sm:p-10">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#e1c687]">
            <span className="rounded-full bg-[#e1c687]/10 px-3 py-1 capitalize">
              {item.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {item.city}
            </span>
          </div>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl">{item.title}</h1>
          <div className="mt-5 flex items-center gap-3 text-sm text-slate-400">
            <span>{item.displayName || "Private member"}</span>
            <VerificationBadge status={item.verificationStatus} />
          </div>
          <p className="mt-8 whitespace-pre-line text-base leading-8 text-slate-300">
            {item.description}
          </p>
          <div className="mt-10 flex flex-wrap gap-3 border-t border-white/8 pt-6">
            <Button
              onClick={() => go("/inbox")}
              className="rounded-xl bg-[#e1c687] text-[#10172c]"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Message member
            </Button>
            <Button
              onClick={() => go(`/report/listing/${item.id}`)}
              variant="outline"
              className="rounded-xl border-white/15 text-slate-200"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Report concern
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
}
