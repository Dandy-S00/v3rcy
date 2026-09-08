import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const EMOJIS = ["❤️", "✨", "🔥", "😊", "💬", "👏"];

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CommunityFeed() {
  const [page, setPage] = useState(1);
  const [body, setBody] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const utils = trpc.useUtils() as any;
  const communityApi = (trpc as any).community;
  const feed = communityApi.feed.useQuery({ page });
  const createPost = communityApi.create.useMutation({
    onSuccess: () => { setBody(""); utils.community.feed.invalidate(); toast.success("Your post is live."); },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const react = communityApi.react.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error: { message: string }) => toast.error(error.message) });
  const comment = communityApi.comment.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error: { message: string }) => toast.error(error.message) });
  const setComments = communityApi.setComments.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error: { message: string }) => toast.error(error.message) });

  function submitPost() {
    if (!body.trim()) return;
    createPost.mutate({ body, commentsEnabled, visibility: "community" });
  }

  function submitComment(event: FormEvent<HTMLFormElement>, postId: number) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("comment") as HTMLInputElement | null;
    if (!input?.value.trim()) return;
    comment.mutate({ postId, body: input.value });
    input.value = "";
  }

  return (
    <main className="community-page page-shell">
      <section className="community-hero glass-panel">
        <div>
          <p className="eyebrow">Private community</p>
          <h1>A softer place to connect.</h1>
          <p className="muted-copy">Share thoughts, discover common ground, and stay in control of your privacy.</p>
        </div>
        <ShieldCheck aria-hidden="true" size={34} />
      </section>

      <section className="community-layout">
        <aside className="community-sidebar glass-panel">
          <Sparkles size={22} />
          <h2>Community guidelines</h2>
          <p>Keep posts respectful, adult-only, and free from personal contact details. Report anything that feels unsafe.</p>
          <Link href="/safety" className="text-link">Review safety tools</Link>
        </aside>

        <div className="feed-column">
          <section className="composer glass-panel">
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={3000} placeholder="Share something with the community…" aria-label="Post text" />
            <div className="composer-footer">
              <label className="toggle-label"><input type="checkbox" checked={commentsEnabled} onChange={(event) => setCommentsEnabled(event.target.checked)} /> Allow comments</label>
              <button className="primary-button" onClick={submitPost} disabled={createPost.isPending || !body.trim()}><Send size={16} /> Post</button>
            </div>
          </section>

          {feed.isLoading && <div className="glass-panel empty-state">Loading the community…</div>}
          {feed.data?.posts.map((post: any) => (
            <article className="post-card glass-panel" key={post.id}>
              <header className="post-header">
                <div className="avatar-placeholder" aria-hidden="true">{post.author.name.slice(0, 1).toUpperCase()}</div>
                <div><strong>{post.author.name}</strong><p>{post.author.city ?? "Private location"} · {formatDate(post.createdAt)}</p></div>
              </header>
              <p className="post-body">{post.body}</p>
              {post.mediaUrl && <img className="post-media" src={post.mediaUrl} alt="Community post" />}
              <div className="reaction-row" aria-label="Reactions">
                {post.reactions.map((reaction: any) => (
                  <button key={reaction.emoji} className={reaction.selected ? "reaction-chip selected" : "reaction-chip"} onClick={() => react.mutate({ postId: post.id, emoji: reaction.emoji })}>{reaction.emoji} {reaction.total}</button>
                ))}
                {EMOJIS.filter((emoji) => !post.reactions.some((reaction: any) => reaction.emoji === emoji)).map((emoji) => (
                  <button key={emoji} className="reaction-add" onClick={() => react.mutate({ postId: post.id, emoji })} aria-label={`Add ${emoji} reaction`}>{emoji}</button>
                ))}
                <span className="comment-count"><MessageCircle size={15} /> {post.commentCount}</span>
              </div>
              {post.commentsEnabled ? (
                <form className="comment-form" onSubmit={(event) => submitComment(event, post.id)}>
                  <input name="comment" placeholder="Write a respectful comment…" maxLength={1000} aria-label="Comment" />
                  <button className="icon-button" aria-label="Send comment"><Send size={16} /></button>
                </form>
              ) : <p className="comments-disabled">Comments are disabled by the author.</p>}
              {post.isOwner && <button className="privacy-button" onClick={() => setComments.mutate({ postId: post.id, enabled: !post.commentsEnabled })}>{post.commentsEnabled ? "Disable comments" : "Enable comments"}</button>}
            </article>
          ))}

          {!feed.isLoading && !feed.data?.posts.length && <div className="glass-panel empty-state">No community posts yet. Start the conversation.</div>}
          <div className="feed-pagination">
            <button className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page}</span>
            <button className="secondary-button" disabled={!feed.data?.hasMore} onClick={() => setPage((value) => value + 1)}>Load more</button>
          </div>
        </div>
      </section>
    </main>
  );
}
