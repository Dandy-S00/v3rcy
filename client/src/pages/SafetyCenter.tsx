import {
  ArrowRight,
  EyeOff,
  Flag,
  HeartHandshake,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const standards = [
  {
    icon: EyeOff,
    title: "Protect personal details",
    copy: "Profiles and listings are city-level only. Never share an address, financial account details, or information that you are not ready to disclose.",
  },
  {
    icon: HeartHandshake,
    title: "Use safety signals early",
    copy: "Mark a contact as safe or raise a discreet safety alert directly from a profile or listing whenever something feels off.",
  },
  {
    icon: Flag,
    title: "Report with context",
    copy: "Choose a report category and describe what happened. You can track whether your report was received, under review, or closed.",
  },
];

export default function SafetyCenter() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const reports = trpc.safety.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  return (
    <div className="min-h-screen bg-[#080d1d] text-white">
      <SiteHeader />
      <main>
        <section className="border-b border-white/8 bg-[#0c1326]">
          <div className="container grid gap-8 py-16 sm:py-20 lg:grid-cols-[1fr_.72fr] lg:items-center">
            <div>
              <p className="eyebrow">A direct path to help</p>
              <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.02] sm:text-6xl">
                Safety is part of every interaction.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
                v3rya is designed to support thoughtful decisions. You can
                pause, protect your privacy, make a discreet signal, or report a
                concern without navigating away from the moment.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#e1c687]/20 bg-[#e1c687]/7 p-7">
              <ShieldAlert className="h-6 w-6 text-[#e1c687]" />
              <h2 className="mt-5 font-serif text-3xl">
                If something feels urgent
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Use the safety alert action on a listing or profile. If you or
                someone else is in immediate danger, contact local emergency
                services.
              </p>
              <button
                onClick={() => setLocation("/browse")}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#e1c687] transition hover:text-[#f0da9f]"
              >
                Browse with safety tools <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
        <section className="container py-16 sm:py-20">
          <div className="grid gap-4 md:grid-cols-3">
            {standards.map(({ icon: Icon, title, copy }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/9 bg-white/[.035] p-6"
              >
                <Icon className="h-5 w-5 text-[#e1c687]" />
                <h2 className="mt-6 font-serif text-2xl">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p>
              </article>
            ))}
          </div>
          <section className="mt-10 rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Your report status</p>
                <h2 className="mt-3 font-serif text-3xl">
                  A transparent follow-through
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> Only you
                and authorized moderators see report details.
              </span>
            </div>
            {!isAuthenticated ? (
              <p className="mt-8 text-sm text-slate-400">
                Sign in to see reports you have submitted.
              </p>
            ) : reports.data?.length ? (
              <div className="mt-7 divide-y divide-white/8">
                {reports.data.map(report => (
                  <div
                    key={report.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {report.category.replace("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Submitted{" "}
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs capitalize text-slate-300">
                      {report.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-8 text-sm leading-6 text-slate-400">
                You have not submitted any reports. Report and safety actions
                are available directly from listings and profiles.
              </p>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
