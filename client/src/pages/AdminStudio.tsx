import {
  CheckCircle2,
  Flag,
  LayoutList,
  ShieldAlert,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminStudio() {
  const { user, loading } = useAuth();
  const enabled = user?.role === "admin";
  const dashboard = trpc.admin.dashboard.useQuery(undefined, { enabled });
  const members = trpc.admin.members.useQuery(undefined, { enabled });
  const alerts = trpc.admin.safetyAlerts.useQuery(undefined, { enabled });
  const utils = trpc.useUtils();
  const refresh = () => {
    utils.admin.dashboard.invalidate();
    utils.admin.members.invalidate();
    utils.admin.safetyAlerts.invalidate();
  };
  const moderate = trpc.admin.moderateListing.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Listing action recorded.");
    },
    onError: error => toast.error(error.message),
  });
  const updateReport = trpc.admin.updateReport.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Report status updated.");
    },
    onError: error => toast.error(error.message),
  });
  const updateAlert = trpc.admin.updateSafetyAlert.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Safety alert status updated.");
    },
    onError: error => toast.error(error.message),
  });
  const setVerification = trpc.admin.setVerification.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Verification status updated and recorded.");
    },
    onError: error => toast.error(error.message),
  });
  const setAccount = trpc.admin.setAccountStatus.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Account status updated and recorded.");
    },
    onError: error => toast.error(error.message),
  });
  if (loading) return <div className="min-h-screen bg-[#080d1d]" />;
  if (!enabled)
    return (
      <div className="min-h-screen bg-[#080d1d] text-white">
        <div className="container flex min-h-screen items-center justify-center">
          <div className="max-w-md rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-8 text-center">
            <ShieldAlert className="mx-auto h-7 w-7 text-[#e1c687]" />
            <h1 className="mt-5 font-serif text-3xl">Restricted workspace</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This operational space is available only to authorized
              administrators.
            </p>
          </div>
        </div>
      </div>
    );
  const metricItems = [
    {
      label: "Members",
      value: dashboard.data?.metrics.members ?? 0,
      icon: Users,
    },
    {
      label: "Live listings",
      value: dashboard.data?.metrics.liveListings ?? 0,
      icon: LayoutList,
    },
    {
      label: "Open reports",
      value: dashboard.data?.metrics.openReports ?? 0,
      icon: Flag,
    },
    {
      label: "Active safety alerts",
      value: dashboard.data?.metrics.alerts ?? 0,
      icon: ShieldAlert,
    },
  ];
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#080d1d] p-4 text-white sm:p-7">
        <div className="mb-8">
          <p className="eyebrow">Private operations</p>
          <h1 className="mt-3 font-serif text-4xl">v3rya Studio</h1>
          <p className="mt-2 text-sm text-slate-400">
            Moderation, reports, safety alerts, member account controls, and
            platform activity. Every action is recorded server-side.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/9 bg-white/[.035] p-5"
            >
              <Icon className="h-5 w-5 text-[#e1c687]" />
              <p className="mt-8 text-3xl font-semibold">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-7 grid gap-7 xl:grid-cols-2">
          <section className="rounded-[1.25rem] border border-white/10 bg-[#0c1326] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Listing queue</p>
                <h2 className="mt-2 font-serif text-2xl">Incoming listings</h2>
              </div>
              <span className="rounded-full bg-[#e1c687]/10 px-3 py-1.5 text-xs text-[#e1c687]">
                Live by default
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {dashboard.data?.queue.length ? (
                dashboard.data.queue.map(listing => (
                  <div
                    key={listing.id}
                    className="rounded-xl border border-white/8 bg-white/[.025] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{listing.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {listing.category} · {listing.city} ·{" "}
                          {listing.displayName || "Private member"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            moderate.mutate({
                              listingId: listing.id,
                              action: "approve",
                            })
                          }
                          className="h-8 rounded-lg bg-emerald-400/15 px-3 text-emerald-200 hover:bg-emerald-400/25"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            moderate.mutate({
                              listingId: listing.id,
                              action: "flag",
                            })
                          }
                          className="h-8 rounded-lg border-amber-300/20 px-3 text-amber-100 hover:bg-amber-400/10 hover:text-amber-50"
                        >
                          Flag
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            moderate.mutate({
                              listingId: listing.id,
                              action: "remove",
                            })
                          }
                          className="h-8 rounded-lg border-rose-300/20 px-3 text-rose-200 hover:bg-rose-400/10 hover:text-rose-100"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-white/12 p-6 text-center text-sm text-slate-500">
                  No unreviewed listings in the queue.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-[1.25rem] border border-white/10 bg-[#0c1326] p-5 sm:p-6">
            <div>
              <p className="eyebrow">Report review</p>
              <h2 className="mt-2 font-serif text-2xl">Open reports</h2>
            </div>
            <div className="mt-5 space-y-3">
              {dashboard.data?.reports.length ? (
                dashboard.data.reports.map(report => (
                  <div
                    key={report.id}
                    className="rounded-xl border border-white/8 bg-white/[.025] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {report.category.replace("_", " ")}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {report.detail}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          updateReport.mutate({
                            reportId: report.id,
                            status: "under_review",
                            reporterUpdate: "Your report is under review.",
                          })
                        }
                        className="h-8 shrink-0 rounded-lg bg-[#e1c687]/10 px-3 text-[#e1c687] hover:bg-[#e1c687]/20"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-white/12 p-6 text-center text-sm text-slate-500">
                  No open reports at this time.
                </p>
              )}
            </div>
          </section>
        </div>
        <section className="mt-7 rounded-[1.25rem] border border-amber-300/15 bg-[#121426] p-5 sm:p-6">
          <div>
            <p className="eyebrow">Safety-alert review</p>
            <h2 className="mt-2 font-serif text-2xl">
              Signals requiring attention
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Safety alerts are visible only to authorized moderators. Resolve
              them only after the appropriate follow-through.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {alerts.data?.length ? (
              alerts.data.map(alert => (
                <div
                  key={alert.id}
                  className="flex flex-col gap-4 rounded-xl border border-white/8 bg-white/[.025] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Safety alert #{alert.id}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {alert.note || "No additional note provided."}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      Reported {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateAlert.mutate({
                          alertId: alert.id,
                          status: "under_review",
                        })
                      }
                      className="h-8 rounded-lg bg-amber-300/10 px-3 text-amber-100 hover:bg-amber-300/20"
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        updateAlert.mutate({
                          alertId: alert.id,
                          status: "resolved",
                        })
                      }
                      className="h-8 rounded-lg bg-emerald-400/15 px-3 text-emerald-200 hover:bg-emerald-400/25"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-white/12 p-6 text-center text-sm text-slate-500">
                No active safety alerts.
              </p>
            )}
          </div>
        </section>
        <section className="mt-7 rounded-[1.25rem] border border-white/10 bg-[#0c1326] p-5 sm:p-6">
          <div>
            <p className="eyebrow">Member management</p>
            <h2 className="mt-2 font-serif text-2xl">Recent member profiles</h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage verification and account standing only after your
              documented review process is complete. Every change is audited.
            </p>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-white/8 text-xs font-medium tracking-[.12em] text-slate-500 uppercase">
                <tr>
                  <th className="pb-3">Member</th>
                  <th className="pb-3">City</th>
                  <th className="pb-3">Verification</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3 text-right">Controls</th>
                </tr>
              </thead>
              <tbody>
                {members.data?.map(member => (
                  <tr
                    key={member.userId}
                    className="border-b border-white/[.06]"
                  >
                    <td className="py-4">
                      <p className="font-medium text-slate-200">
                        {member.displayName ||
                          member.name ||
                          "Profile incomplete"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {member.email || "No email provided"}
                      </p>
                    </td>
                    <td className="py-4 text-slate-400">
                      {member.city || "—"}
                    </td>
                    <td className="py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs capitalize text-slate-300">
                        {member.verificationStatus || "profile missing"}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs capitalize text-slate-300">
                        {member.accountStatus || "profile missing"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <select
                          value={member.verificationStatus || "none"}
                          disabled={
                            !member.verificationStatus ||
                            setVerification.isPending
                          }
                          onChange={event =>
                            setVerification.mutate({
                              userId: member.userId,
                              status: event.target.value as
                                | "none"
                                | "email"
                                | "id",
                            })
                          }
                          className="rounded-lg border border-white/10 bg-[#080d1d] px-2 py-1.5 text-xs text-slate-200 outline-none disabled:opacity-40"
                        >
                          <option value="none">Not verified</option>
                          <option value="email">Email verified</option>
                          <option value="id">ID verified</option>
                        </select>
                        <select
                          value={member.accountStatus || "active"}
                          disabled={
                            !member.accountStatus || setAccount.isPending
                          }
                          onChange={event =>
                            setAccount.mutate({
                              userId: member.userId,
                              status: event.target.value as
                                | "active"
                                | "review"
                                | "suspended",
                            })
                          }
                          className="rounded-lg border border-white/10 bg-[#080d1d] px-2 py-1.5 text-xs text-slate-200 outline-none disabled:opacity-40"
                        >
                          <option value="active">Active</option>
                          <option value="review">In review</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
