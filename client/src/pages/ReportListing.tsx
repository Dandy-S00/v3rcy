import { ArrowLeft, Flag, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const categories = [
  "harassment",
  "misrepresentation",
  "prohibited_content",
  "underage_concern",
  "safety_concern",
  "other",
] as const;

export default function ReportListing() {
  const [location, setLocation] = useLocation();
  const listingId = Number(location.split("/").pop());
  const { isAuthenticated, loading } = useAuth();
  const [category, setCategory] =
    useState<(typeof categories)[number]>("prohibited_content");
  const [detail, setDetail] = useState("");
  const report = trpc.safety.report.useMutation({
    onSuccess: () => {
      toast.success(
        "Your report was received. You can track its status in the safety center."
      );
      setLocation("/safety");
    },
    onError: error => toast.error(error.message),
  });
  if (loading) return <div className="min-h-screen bg-[#080d1d]" />;
  if (!isAuthenticated)
    return (
      <div className="min-h-screen bg-[#080d1d] text-white">
        <SiteHeader />
        <main className="container py-20">
          <div className="mx-auto max-w-xl rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-8 text-center">
            <LockKeyhole className="mx-auto h-6 w-6 text-[#e1c687]" />
            <h1 className="mt-5 font-serif text-4xl">
              Reports are member-only.
            </h1>
            <p className="mt-3 text-slate-400">
              Sign in so we can confirm receipt and keep you updated as the
              report is reviewed.
            </p>
            <Button
              onClick={() => startLogin()}
              className="mt-7 rounded-xl bg-[#e1c687] text-[#10172c] hover:bg-[#f0da9f]"
            >
              Sign in to report
            </Button>
          </div>
        </main>
      </div>
    );
  return (
    <div className="min-h-screen bg-[#080d1d] text-white">
      <SiteHeader />
      <main className="container max-w-3xl py-10 sm:py-14">
        <button
          onClick={() => setLocation("/browse")}
          className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </button>
        <section className="mt-8 rounded-[1.5rem] border border-rose-300/15 bg-[#121426] p-7 sm:p-9">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-400/10 text-rose-200">
            <Flag className="h-5 w-5" />
          </span>
          <p className="mt-7 eyebrow">Confidential listing report</p>
          <h1 className="mt-3 font-serif text-4xl">
            Help us review this listing.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            Choose the closest category and share enough context for the
            moderation team to act. Your report is not shown to the listing
            owner.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-[220px_1fr]">
            <label className="field-label">
              Report category
              <select
                value={category}
                onChange={event =>
                  setCategory(event.target.value as typeof category)
                }
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-[#080d1d] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#e1c687]"
              >
                {categories.map(item => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              What should the team know?
              <Textarea
                value={detail}
                onChange={event => setDetail(event.target.value)}
                placeholder="Describe the concern without sharing private details that are not needed for the review."
                className="mt-2 min-h-32 border-white/10 bg-[#080d1d] text-white placeholder:text-slate-600"
              />
            </label>
          </div>
          <div className="mt-7 flex justify-end border-t border-white/8 pt-5">
            <Button
              disabled={
                detail.trim().length < 10 ||
                report.isPending ||
                !Number.isFinite(listingId)
              }
              onClick={() => report.mutate({ listingId, category, detail })}
              className="rounded-xl bg-rose-300 text-[#261020] hover:bg-rose-200"
            >
              {report.isPending ? "Submitting…" : "Send confidential report"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
