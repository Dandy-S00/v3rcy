import {
  ArrowLeft,
  CircleAlert,
  LockKeyhole,
  MapPin,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PostListing() {
  const [, setLocation] = useLocation();
  const profile = trpc.profile.mine.useQuery();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "dating" as "dating" | "companionship" | "casual" | "social",
    city: "",
  });
  const create = trpc.listings.create.useMutation({
    onSuccess: () => {
      toast.success(
        "Your listing is live and has entered the moderation queue."
      );
      setLocation("/browse");
    },
    onError: error => toast.error(error.message),
  });
  return (
    <div className="min-h-screen bg-[#080d1d] text-white">
      <SiteHeader />
      <main className="container max-w-4xl py-10 sm:py-14">
        <button
          onClick={() => setLocation("/browse")}
          className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </button>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <section className="rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-6 sm:p-8">
            <p className="eyebrow">A clear introduction</p>
            <h1 className="mt-3 font-serif text-4xl">Create your listing</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Listings are published immediately by default and then remain
              subject to moderation standards.
            </p>
            <div className="mt-8 space-y-5">
              <label className="field-label">
                Title{" "}
                <Input
                  value={form.title}
                  onChange={event =>
                    setForm({ ...form, title: event.target.value })
                  }
                  maxLength={120}
                  placeholder="Keep it considerate and clear"
                  className="mt-2 h-11 border-white/10 bg-[#080d1d] text-white placeholder:text-slate-600"
                />
              </label>
              <label className="field-label">
                Category{" "}
                <select
                  value={form.category}
                  onChange={event =>
                    setForm({
                      ...form,
                      category: event.target.value as typeof form.category,
                    })
                  }
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-[#080d1d] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#e1c687]"
                >
                  <option value="dating">Dating</option>
                  <option value="casual">Casual</option>
                  <option value="social">Social</option>
                  <option value="companionship">
                    Companionship · ID verified
                  </option>
                </select>
              </label>
              <label className="field-label">
                City or metro area{" "}
                <div className="relative mt-2">
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <Input
                    value={form.city}
                    onChange={event =>
                      setForm({ ...form, city: event.target.value })
                    }
                    placeholder="No street addresses or coordinates"
                    className="h-11 border-white/10 bg-[#080d1d] pl-10 text-white placeholder:text-slate-600"
                  />
                </div>
              </label>
              <label className="field-label">
                Description{" "}
                <Textarea
                  value={form.description}
                  onChange={event =>
                    setForm({ ...form, description: event.target.value })
                  }
                  maxLength={3000}
                  placeholder="Describe the type of connection you are looking for. Do not include private contact details."
                  className="mt-2 min-h-44 border-white/10 bg-[#080d1d] text-white placeholder:text-slate-600"
                />
              </label>
            </div>
            <div className="mt-8 flex justify-end border-t border-white/8 pt-6">
              <Button
                disabled={create.isPending || !profile.data}
                onClick={() => create.mutate(form)}
                className="h-11 rounded-xl bg-[#e1c687] px-5 text-[#10172c] hover:bg-[#f0da9f]"
              >
                <Send className="mr-2 h-4 w-4" />
                {create.isPending ? "Publishing…" : "Publish listing"}
              </Button>
            </div>
          </section>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#e1c687]/20 bg-[#e1c687]/7 p-5">
              <LockKeyhole className="h-5 w-5 text-[#e1c687]" />
              <h2 className="mt-3 font-medium">Publishing access</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {profile.data
                  ? "Your profile is connected. Restricted categories use your verification level."
                  : "Complete your adult profile before publishing a listing."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/9 bg-white/[.035] p-5">
              <CircleAlert className="h-5 w-5 text-slate-300" />
              <h2 className="mt-3 font-medium">A thoughtful reminder</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Do not include an address, direct contact details, illegal
                offers, or prohibited content. Moderator action may remove a
                listing at any time.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
