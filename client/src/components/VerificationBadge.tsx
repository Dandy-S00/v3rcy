import { BadgeCheck, MailCheck, ShieldCheck } from "lucide-react";

export default function VerificationBadge({
  status,
}: {
  status: "none" | "email" | "id" | undefined | null;
}) {
  if (status === "id")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
        <BadgeCheck className="h-3.5 w-3.5" /> ID verified
      </span>
    );
  if (status === "email")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200">
        <MailCheck className="h-3.5 w-3.5" /> Email verified
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-400">
      <ShieldCheck className="h-3.5 w-3.5" /> Verification pending
    </span>
  );
}
