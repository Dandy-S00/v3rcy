import {
  ArrowLeft,
  Flag,
  MapPin,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import SiteHeader from "@/components/SiteHeader";
import VerificationBadge from "@/components/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const reportTypes = [
  "harassment",
  "misrepresentation",
  "prohibited_content",
  "underage_concern",
  "safety_concern",
  "other",
] as const;
export default function MemberProfile() {
  const [location, go] = useLocation();
  const memberId = Number(location.split("/").pop());
  const { isAuthenticated } = useAuth();
  const profile = trpc.profile.get.useQuery(
    { userId: memberId },
    { enabled: Number.isFinite(memberId) && memberId > 0 }
  );
  const [showReport, setShowReport] = useState(false);
  const [category, setCategory] =
    useState<(typeof reportTypes)[number]>("safety_concern");
  const [detail, setDetail] = useState("");
  const safety = trpc.safety.signal.useMutation({
    onSuccess: () => toast.success("Your private safety signal was received."),
    onError: error => toast.error(error.message),
  });
  const report = trpc.safety.report.useMutation({
    onSuccess: () => {
      toast.success(
        "Your report was received and can be tracked in the safety center."
      );
      setDetail("");
      setShowReport(false);
    },
    onError: error => toast.error(error.message),
  });
  const member = profile.data;
  return (
    <div className="min-h-screen bg-[#080d1d] text-white">
      <SiteHeader />
      <main className="container max-w-6xl py-10 sm:py-14">
        <button
          onClick={() => go("/browse")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </button>
        {profile.isLoading ? (
          <div className="mt-8 h-96 animate-pulse rounded-[1.5rem] bg-white/5" />
        ) : member ? (
          <>
            <section className="mt-8 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#0c1326]">
              <div className="grid auto-rows-[170px] grid-cols-2 gap-1.5 bg-[#080d1d] sm:auto-rows-[250px] md:grid-cols-4">
                {member.media?.length ? (
                  member.media.map((item, index) => (
                    <figure
                      key={item.id}
                      className={`relative overflow-hidden bg-black ${index === 0 ? "col-span-2 row-span-2" : ""}`}
                    >
                      {item.mediaType === "image" ? (
                        <img
                          src={item.url}
                          alt={item.caption || "Member photo"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.url}
                          controls
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {index === 0 && (
                        <figcaption className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                          Profile highlight
                        </figcaption>
                      )}
                    </figure>
                  ))
                ) : (
                  <div className="col-span-2 flex min-h-[330px] items-center justify-center bg-gradient-to-br from-[#121d38] to-[#080d1d] text-center text-slate-500">
                    <div>
                      <p className="font-serif text-3xl text-slate-300">
                        A private introduction.
                      </p>
                      <p className="mt-2 text-sm">
                        This member has not added public media.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
              <section className="rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-7 sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Member profile</p>
                    <h1 className="mt-3 font-serif text-5xl">
                      {member.displayName || "Private member"}
                    </h1>
                    <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                      <MapPin className="h-4 w-4 text-[#e1c687]" />
                      {member.city} · {member.age}+
                    </p>
                  </div>
                  <VerificationBadge status={member.verificationStatus} />
                </div>
                <p className="mt-9 max-w-2xl whitespace-pre-wrap text-base leading-8 text-slate-300">
                  {member.bio ||
                    "This member has chosen to keep their introduction brief."}
                </p>
                {member.preferences?.length ? (
                  <div className="mt-8 border-t border-white/8 pt-6">
                    <p className="text-xs font-medium tracking-[.16em] text-slate-500 uppercase">
                      Open to
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.preferences.map(preference => (
                        <span
                          key={preference}
                          className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-sm text-slate-300"
                        >
                          {preference}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
              <aside className="space-y-4">
                <div className="rounded-2xl border border-[#e1c687]/20 bg-[#e1c687]/7 p-5">
                  <ShieldCheck className="h-5 w-5 text-[#e1c687]" />
                  <h2 className="mt-3 font-medium">Interact thoughtfully</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Private messaging is available only after both members have
                    a verification status.
                  </p>
                  <Button
                    onClick={() =>
                      isAuthenticated
                        ? go(
                            `/inbox?to=${member.userId}&name=${encodeURIComponent(member.displayName || "Private member")}`
                          )
                        : startLogin()
                    }
                    className="mt-5 w-full rounded-xl bg-[#e1c687] text-[#10172c]"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message privately
                  </Button>
                </div>
                <div className="rounded-2xl border border-white/9 bg-white/[.035] p-5">
                  <p className="text-sm font-medium">Safety tools</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    These actions are discreet and are never shown to this
                    member.
                  </p>
                  <button
                    onClick={() =>
                      isAuthenticated
                        ? safety.mutate({
                            subjectUserId: member.userId,
                            signalType: "safe_contact",
                            note: "Marked as safe from a member profile.",
                          })
                        : startLogin()
                    }
                    className="mt-4 flex w-full items-center gap-2 rounded-xl border border-emerald-300/20 px-3 py-2.5 text-left text-sm text-emerald-200"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Mark as safe contact
                  </button>
                  <button
                    onClick={() =>
                      isAuthenticated
                        ? safety.mutate({
                            subjectUserId: member.userId,
                            signalType: "safety_alert",
                            note: "Discreet safety alert triggered from a member profile.",
                          })
                        : startLogin()
                    }
                    className="mt-2 flex w-full items-center gap-2 rounded-xl border border-amber-300/20 px-3 py-2.5 text-left text-sm text-amber-100"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Raise a safety alert
                  </button>
                  <button
                    onClick={() =>
                      isAuthenticated
                        ? setShowReport(value => !value)
                        : startLogin()
                    }
                    className="mt-2 flex w-full items-center gap-2 rounded-xl border border-rose-300/20 px-3 py-2.5 text-left text-sm text-rose-200"
                  >
                    <Flag className="h-4 w-4" />
                    Report this member
                  </button>
                </div>
              </aside>
              {showReport && (
                <section className="rounded-[1.5rem] border border-rose-300/15 bg-[#171524] p-6 lg:col-span-2">
                  <p className="eyebrow">Confidential report</p>
                  <h2 className="mt-3 font-serif text-3xl">
                    Tell the moderation team what happened.
                  </h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr]">
                    <select
                      value={category}
                      onChange={event =>
                        setCategory(event.target.value as typeof category)
                      }
                      className="h-11 rounded-md border border-white/10 bg-[#080d1d] px-3 text-sm text-white"
                    >
                      {reportTypes.map(item => (
                        <option key={item} value={item}>
                          {item.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <Textarea
                      value={detail}
                      onChange={event => setDetail(event.target.value)}
                      placeholder="Share enough context for a moderator to review the concern."
                      className="min-h-24 border-white/10 bg-[#080d1d] text-white"
                    />
                  </div>
                  <div className="mt-4 flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setShowReport(false)}
                      className="text-slate-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={detail.trim().length < 10 || report.isPending}
                      onClick={() =>
                        report.mutate({
                          subjectUserId: member.userId,
                          category,
                          detail,
                        })
                      }
                      className="rounded-xl bg-rose-300 text-[#261020]"
                    >
                      {report.isPending
                        ? "Sending…"
                        : "Send confidential report"}
                    </Button>
                  </div>
                </section>
              )}
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/15 p-16 text-center">
            <h1 className="font-serif text-4xl">
              This profile is unavailable.
            </h1>
            <p className="mt-3 text-slate-400">
              It may no longer be active or visible.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
