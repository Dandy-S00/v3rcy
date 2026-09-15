import {
  AlertTriangle,
  Flag,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import VerificationBadge from "@/components/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const categories = [
  "All",
  "Dating",
  "Companionship",
  "Casual",
  "Social",
] as const;
export default function Browse() {
  const [, go] = useLocation();
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const filters = useMemo(
    () => ({
      category:
        category === "All"
          ? undefined
          : (category.toLowerCase() as
              | "dating"
              | "companionship"
              | "casual"
              | "social"),
      query: query || undefined,
      city: city || undefined,
    }),
    [category, city, query]
  );
  const listings = trpc.listings.browse.useQuery(filters);
  const signal = trpc.safety.signal.useMutation({
    onSuccess: () => toast.success("Your private safety signal was received."),
    onError: error => toast.error(error.message),
  });
  return (
    <div className="min-h-screen bg-[#080d1d] text-white">
      <SiteHeader />
      <main className="container py-10 sm:py-14">
        <div className="flex flex-col gap-6 border-b border-white/8 pb-9 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Discover thoughtfully</p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl">
              Current listings
            </h1>
            <p className="mt-3 max-w-xl leading-7 text-slate-400">
              Browse city-level listings at your own pace. Only share more when
              you decide it is right.
            </p>
          </div>
          <Button
            onClick={() => go("/post")}
            className="h-11 rounded-xl bg-[#e1c687] text-[#10172c]"
          >
            Create a listing
          </Button>
        </div>
        <section className="mt-8 rounded-2xl border border-white/9 bg-white/[.035] p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search titles and descriptions"
                className="h-11 border-white/10 bg-[#0b1123] pl-10 text-white"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input
                value={city}
                onChange={event => setCity(event.target.value)}
                placeholder="Filter by city"
                className="h-11 border-white/10 bg-[#0b1123] pl-10 text-white"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map(item => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full px-3.5 py-2 text-sm ${category === item ? "bg-[#e1c687] font-semibold text-[#10172c]" : "border border-white/10 bg-white/[.025] text-slate-300"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
        <section className="mt-8">
          {listings.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map(item => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-2xl bg-white/5"
                />
              ))}
            </div>
          ) : listings.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {listings.data.map(listing => (
                <article
                  key={listing.id}
                  className="flex min-h-72 flex-col rounded-2xl border border-white/9 bg-[#0c1326] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-[#e1c687]/10 px-3 py-1 text-xs font-medium text-[#e1c687] capitalize">
                      {listing.category}
                    </span>
                    <button
                      onClick={() =>
                        signal.mutate({
                          listingId: listing.id,
                          signalType: "safety_alert",
                          note: "Discreet alert triggered from a listing.",
                        })
                      }
                      className="text-slate-500 hover:text-rose-300"
                      aria-label="Discreetly raise a safety alert"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </button>
                  </div>
                  <h2 className="mt-5 font-serif text-2xl leading-tight">
                    {listing.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                    {listing.description}
                  </p>
                  <div className="mt-auto border-t border-white/8 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <button
                          onClick={() => go(`/member/${listing.ownerUserId}`)}
                          className="text-sm font-medium text-slate-200 hover:text-[#e1c687]"
                        >
                          {listing.displayName || "Private member"}
                        </button>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {listing.city}
                        </p>
                      </div>
                      <VerificationBadge status={listing.verificationStatus} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {listing.moderationStatus === "approved" && (
                        <button
                          onClick={() => go(`/listing/${listing.id}`)}
                          className="rounded-xl bg-[#e1c687] px-2 py-2.5 text-xs font-semibold text-[#10172c]"
                        >
                          View listing
                        </button>
                      )}
                      <button
                        onClick={() => go(`/inbox?to=${listing.ownerUserId}`)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-white/6 px-2 py-2.5 text-xs text-slate-200"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Message
                      </button>
                      <button
                        onClick={() =>
                          signal.mutate({
                            listingId: listing.id,
                            signalType: "safe_contact",
                            note: "Marked as a safe contact from listing browse.",
                          })
                        }
                        className="flex items-center justify-center gap-1 rounded-xl border border-white/10 px-2 py-2.5 text-xs text-slate-300"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Safe
                      </button>
                      <button
                        onClick={() => go(`/report/listing/${listing.id}`)}
                        className="flex items-center justify-center gap-1 rounded-xl border border-rose-300/15 px-2 py-2.5 text-xs text-rose-200"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/[.02] px-6 py-20 text-center">
              <Search className="mx-auto h-7 w-7 text-[#e1c687]" />
              <h2 className="mt-5 font-serif text-3xl">
                No listings match these filters.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                Try broadening your search or be the first to create a listing
                in this city.
              </p>
              <Button
                onClick={() => go("/post")}
                variant="outline"
                className="mt-7 rounded-xl border-white/15 bg-transparent text-white"
              >
                Create a listing
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
