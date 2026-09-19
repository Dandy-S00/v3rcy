import { ChevronLeft, ChevronRight, Eye, EyeOff, GripVertical, ImagePlus, Lock, MapPin, Star, Trash2, Upload, Video } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import VerificationBadge from "@/components/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Profile() {
  const { isAuthenticated, loading } = useAuth();
  const profile = trpc.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  const media = trpc.profile.media.useQuery(undefined, { enabled: isAuthenticated });
  const [form, setForm] = useState({ displayName: "", bio: "", age: "", city: "", preferences: "" });
  const [uploading, setUploading] = useState(false);
  const [hasMediaRights, setHasMediaRights] = useState(false);
  const [draggedMediaId, setDraggedMediaId] = useState<number | null>(null);
  const [orderMessage, setOrderMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.data) setForm({ displayName: profile.data.displayName || "", bio: profile.data.bio || "", age: String(profile.data.age), city: profile.data.city, preferences: (profile.data.preferences || []).join(", ") });
  }, [profile.data]);

  const save = trpc.profile.save.useMutation({ onSuccess: () => { toast.success("Your profile has been saved."); profile.refetch(); }, onError: error => toast.error(error.message) });
  const remove = trpc.profile.deleteMedia.useMutation({ onSuccess: () => { toast.success("Media removed."); media.refetch(); }, onError: error => toast.error(error.message) });
  const updateMedia = trpc.profile.updateMedia.useMutation({ onSuccess: () => media.refetch(), onError: error => toast.error(error.message) });
  const reorderMedia = trpc.profile.reorderMedia.useMutation({
    onSuccess: () => { setDraggedMediaId(null); setOrderMessage("Gallery order saved."); media.refetch(); },
    onError: error => { setDraggedMediaId(null); toast.error(error.message); },
  });

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (!hasMediaRights) return toast.error("Confirm you own the media or have permission to publish it before uploading.");
    if (files.some(file => file.size > 25 * 1024 * 1024)) return toast.error("Each photo or video must be 25 MB or smaller.");
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) throw new Error("Choose an image or video file.");
        const response = await fetch("/api/profile-media", { method: "POST", headers: { "Content-Type": file.type, "X-Profile-Media-Attestation": "true" }, body: file });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Upload failed.");
      }
      await media.refetch();
      toast.success("Media added to your profile.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const requestOrder = (mediaIds: number[], message: string) => {
    if (reorderMedia.isPending || !mediaIds.length || mediaIds.every((mediaId, index) => mediaId === media.data?.[index]?.id)) return;
    setOrderMessage(message);
    reorderMedia.mutate({ mediaIds });
  };

  const moveMedia = (mediaId: number, direction: -1 | 1) => {
    const mediaIds = media.data?.map(item => item.id) || [];
    const sourceIndex = mediaIds.indexOf(mediaId);
    const destinationIndex = sourceIndex + direction;
    if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= mediaIds.length) return;
    [mediaIds[sourceIndex], mediaIds[destinationIndex]] = [mediaIds[destinationIndex], mediaIds[sourceIndex]];
    requestOrder(mediaIds, `Moving gallery item ${sourceIndex + 1} ${direction === -1 ? "earlier" : "later"}.`);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetMediaId: number) => {
    event.preventDefault();
    const draggedId = draggedMediaId ?? Number(event.dataTransfer.getData("text/plain"));
    const mediaIds = media.data?.map(item => item.id) || [];
    const sourceIndex = mediaIds.indexOf(draggedId);
    const targetIndex = mediaIds.indexOf(targetMediaId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return setDraggedMediaId(null);
    mediaIds.splice(sourceIndex, 1);
    mediaIds.splice(targetIndex, 0, draggedId);
    requestOrder(mediaIds, `Moving gallery item ${sourceIndex + 1} to position ${targetIndex + 1}.`);
  };

  if (loading) return <div className="min-h-screen bg-[#080d1d]" />;
  if (!isAuthenticated) return <div className="min-h-screen bg-[#080d1d] text-white"><SiteHeader /><main className="container py-20"><div className="mx-auto max-w-xl rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-8 text-center"><Lock className="mx-auto h-6 w-6 text-[#e1c687]" /><h1 className="mt-5 font-serif text-4xl">Your space is private.</h1><p className="mt-3 text-slate-400">Sign in to shape the profile other members will see.</p><Button onClick={() => startLogin()} className="mt-7 rounded-xl bg-[#e1c687] text-[#10172c]">Sign in to continue</Button></div></main></div>;

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const gallery = media.data || [];
  const canAddMedia = hasMediaRights && !uploading && gallery.length < 8;

  return <div className="min-h-screen bg-[#080d1d] text-white"><SiteHeader /><main className="container py-10 sm:py-14"><div className="flex flex-col gap-3 border-b border-white/8 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Your presence</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">Your profile, in focus.</h1><p className="mt-3 max-w-2xl leading-7 text-slate-400">Photos and videos lead your member page. Control what appears publicly, one item at a time.</p></div><VerificationBadge status={profile.data?.verificationStatus} /></div><section className="mt-8 rounded-[1.7rem] border border-white/10 bg-[#0c1326] p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-serif text-3xl">Photos & videos</h2><p className="mt-1 text-sm text-slate-400">Up to 8 files. JPG, PNG, WebP, GIF, MP4, and WebM. 25 MB each.</p></div><input ref={inputRef} onChange={upload} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple type="file" className="hidden" /><Button disabled={!canAddMedia} onClick={() => inputRef.current?.click()} className="rounded-xl bg-[#e1c687] text-[#10172c]"><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : "Add media"}</Button></div><label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3.5 text-sm leading-6 text-slate-300"><input type="checkbox" checked={hasMediaRights} onChange={event => setHasMediaRights(event.target.checked)} className="mt-1 h-4 w-4 accent-[#e1c687]" /><span>I confirm that I own this watermark-free media or have documented permission to publish it, and that every person pictured is at least 18 and has consented to its use on v3rya.</span></label>{gallery.length > 1 && <div className="mt-5 rounded-xl border border-[#e1c687]/20 bg-[#e1c687]/[.055] px-4 py-3 text-sm leading-6 text-slate-300"><GripVertical className="mr-2 inline h-4 w-4 text-[#e1c687]" />Drag an item onto another to place it in your preferred gallery order. The arrow controls offer the same ordering action from a keyboard or touch device.</div>}<p className="sr-only" aria-live="polite">{orderMessage}</p><div className="mt-6 grid auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[220px] md:grid-cols-4">{gallery.map((item, index) => <figure key={item.id} draggable={!reorderMedia.isPending} onDragStart={event => { setDraggedMediaId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(item.id)); }} onDragEnd={() => setDraggedMediaId(null)} onDragOver={event => event.preventDefault()} onDrop={event => handleDrop(event, item.id)} className={`group relative overflow-hidden rounded-2xl border bg-black transition ${draggedMediaId === item.id ? "scale-[.98] border-[#e1c687] opacity-60" : item.visibility === "hidden" ? "border-amber-300/40 opacity-70" : "border-white/10"}`}>{item.mediaType === "image" ? <img src={item.url} alt={item.caption || "Profile photo"} className="h-full w-full object-cover" /> : <video src={item.url} controls playsInline preload="metadata" className="h-full w-full object-cover" />}<div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white"><GripVertical className="h-3.5 w-3.5 text-[#e1c687]" /><span>#{index + 1}</span></div><div className="absolute inset-x-2 bottom-2 flex flex-wrap gap-1.5 rounded-xl bg-black/65 p-1.5"><Tooltip><TooltipTrigger asChild><span className="inline-block"><button disabled={index === 0 || reorderMedia.isPending} onClick={() => moveMedia(item.id, -1)} className="rounded-lg p-1 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Move media ${index + 1} earlier`}><ChevronLeft className="h-3.5 w-3.5" /></button></span></TooltipTrigger><TooltipContent side="top">{index === 0 ? "First item in gallery" : "Move media earlier"}</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><span className="inline-block"><button disabled={index === gallery.length - 1 || reorderMedia.isPending} onClick={() => moveMedia(item.id, 1)} className="rounded-lg p-1 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Move media ${index + 1} later`}><ChevronRight className="h-3.5 w-3.5" /></button></span></TooltipTrigger><TooltipContent side="top">{index === gallery.length - 1 ? "Last item in gallery" : "Move media later"}</TooltipContent></Tooltip><button onClick={() => updateMedia.mutate({ mediaId: item.id, visibility: item.visibility === "public" ? "hidden" : "public" })} className="rounded-lg px-2 py-1 text-[11px] text-white hover:bg-white/10">{item.visibility === "public" ? <><EyeOff className="mr-1 inline h-3 w-3" />Hide</> : <><Eye className="mr-1 inline h-3 w-3" />Show</>}</button><button onClick={() => updateMedia.mutate({ mediaId: item.id, featured: true, visibility: "public" })} className="rounded-lg px-2 py-1 text-[11px] text-white hover:bg-white/10"><Star className="mr-1 inline h-3 w-3" />{item.isFeatured ? "Highlight" : "Feature"}</button><Tooltip><TooltipTrigger asChild><button onClick={() => remove.mutate({ mediaId: item.id })} className="ml-auto rounded-lg p-1 text-rose-200 hover:bg-white/10" aria-label="Remove media"><Trash2 className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top">Remove media</TooltipContent></Tooltip></div>{item.isFeatured && <figcaption className="absolute right-3 top-3 rounded-full bg-[#e1c687] px-2 py-1 text-[10px] font-semibold text-[#10172c]">Profile highlight</figcaption>}{item.visibility === "hidden" && <figcaption className="absolute right-3 top-9 rounded-full bg-amber-300 px-2 py-1 text-[10px] font-semibold text-[#10172c]">Hidden</figcaption>}</figure>)}{!gallery.length && <button onClick={() => hasMediaRights ? inputRef.current?.click() : toast.error("Confirm media rights above before choosing files.")} className="col-span-2 flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#e1c687]/40 bg-[#e1c687]/5 text-center text-slate-300"><ImagePlus className="h-8 w-8 text-[#e1c687]" /><span className="mt-3 font-medium">Your gallery begins here</span><span className="mt-1 text-sm text-slate-500">Confirm media rights, then choose photos or a short video to lead your page.</span></button>}</div></section><div className="mt-8 grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><aside><div className="rounded-2xl border border-white/9 bg-white/[.035] p-5"><EyeOff className="h-5 w-5 text-[#e1c687]" /><p className="mt-3 text-sm font-medium">Media visibility</p><p className="mt-2 text-xs leading-5 text-slate-400">Use Hide to remove an item from your public profile without deleting it. Feature selects your main profile visual and makes that item public.</p></div><div className="mt-4 rounded-2xl border border-white/9 bg-white/[.035] p-5"><Video className="h-5 w-5 text-[#e1c687]" /><p className="mt-3 text-sm font-medium">Media is member-controlled</p><p className="mt-2 text-xs leading-5 text-slate-500">You can reorder or remove an item from your page at any time.</p></div></aside><section className="rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-6 sm:p-8"><div className="border-b border-white/8 pb-6"><h2 className="font-serif text-3xl">Profile details</h2><p className="mt-1 text-sm text-slate-400">Required to publish a listing.</p></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="field-label">Display name <Input value={form.displayName} onChange={event => update("displayName", event.target.value)} maxLength={48} placeholder="Choose a name to display" className="mt-2 h-11 border-white/10 bg-[#080d1d] text-white" /></label><label className="field-label">Age <Input value={form.age} onChange={event => update("age", event.target.value)} type="number" min={18} max={99} placeholder="18+" className="mt-2 h-11 border-white/10 bg-[#080d1d] text-white" /></label><label className="field-label sm:col-span-2">City or metro area only <span className="ml-1 text-slate-600">· no address</span><div className="relative mt-2"><MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><Input value={form.city} onChange={event => update("city", event.target.value)} placeholder="e.g., Austin, Texas" className="h-11 border-white/10 bg-[#080d1d] pl-10 text-white" /></div></label><label className="field-label sm:col-span-2">Short bio <Textarea value={form.bio} onChange={event => update("bio", event.target.value)} maxLength={1200} placeholder="Share a little about the kind of connection you are open to." className="mt-2 min-h-32 border-white/10 bg-[#080d1d] text-white" /></label><label className="field-label sm:col-span-2">Preferences <span className="ml-1 text-slate-600">· separated by commas</span><Input value={form.preferences} onChange={event => update("preferences", event.target.value)} placeholder="e.g., thoughtful conversation, evening plans" className="mt-2 h-11 border-white/10 bg-[#080d1d] text-white" /></label></div><div className="mt-8 flex justify-end border-t border-white/8 pt-6"><Button disabled={save.isPending} onClick={() => save.mutate({ displayName: form.displayName || null, bio: form.bio || null, age: Number(form.age), city: form.city, preferences: form.preferences.split(",").map(item => item.trim()).filter(Boolean) })} className="h-11 rounded-xl bg-[#e1c687] px-5 text-[#10172c]">{save.isPending ? "Saving…" : "Save your profile"}</Button></div></section></div></main></div>;
}
