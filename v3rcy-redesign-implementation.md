# v3rcy redesign implementation pack

This pack targets the existing TypeScript/Vite + Wouter + tRPC + Drizzle/MySQL architecture. It adds an original, privacy-first discovery experience and a finite community feed while preserving the existing listing, profile, messaging, safety, and admin routes.

The visual direction is inspired by discreet dating discovery products: editorial profile cards, restrained filters, soft gradients, privacy-forward actions, and a calm premium layout. It does not copy another product's branding, wording, assets, or exact composition.

## 1. Add the database tables

Append these tables to `drizzle/schema.ts` after `actionRateLimits`:

```ts
export const communityPosts = mysqlTable("communityPosts", {
  id: int("id").autoincrement().primaryKey(),
  authorUserId: int("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  mediaUrl: varchar("mediaUrl", { length: 768 }),
  commentsEnabled: boolean("commentsEnabled").default(true).notNull(),
  visibility: mysqlEnum("visibility", ["community", "connections", "private"]).default("community").notNull(),
  moderationStatus: mysqlEnum("moderationStatus", ["pending", "approved", "removed"]).default("approved").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("community_posts_feed_idx").on(table.moderationStatus, table.visibility, table.createdAt),
  index("community_posts_author_idx").on(table.authorUserId, table.createdAt),
]);

export const communityReactions = mysqlTable("communityReactions", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("community_reactions_user_post_emoji_unique").on(table.postId, table.userId, table.emoji),
  index("community_reactions_post_idx").on(table.postId),
]);

export const communityComments = mysqlTable("communityComments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  authorUserId: int("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  moderationStatus: mysqlEnum("moderationStatus", ["approved", "removed"]).default("approved").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("community_comments_post_idx").on(table.postId, table.createdAt),
]);
```

Export inferred types near the existing exports:

```ts
export type CommunityPost = typeof communityPosts.$inferSelect;
export type CommunityComment = typeof communityComments.$inferSelect;
export type CommunityReaction = typeof communityReactions.$inferSelect;
```

## 2. Add the migration

Create `drizzle/0005_community_feed.sql`:

```sql
CREATE TABLE `communityPosts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `authorUserId` int NOT NULL,
  `body` text NOT NULL,
  `mediaUrl` varchar(768),
  `commentsEnabled` boolean NOT NULL DEFAULT true,
  `visibility` enum('community','connections','private') NOT NULL DEFAULT 'community',
  `moderationStatus` enum('pending','approved','removed') NOT NULL DEFAULT 'approved',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `communityPosts_pk` PRIMARY KEY (`id`),
  CONSTRAINT `communityPosts_author_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE INDEX `community_posts_feed_idx` ON `communityPosts` (`moderationStatus`, `visibility`, `createdAt`);
CREATE INDEX `community_posts_author_idx` ON `communityPosts` (`authorUserId`, `createdAt`);

CREATE TABLE `communityReactions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `userId` int NOT NULL,
  `emoji` varchar(16) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `communityReactions_pk` PRIMARY KEY (`id`),
  CONSTRAINT `communityReactions_post_fk` FOREIGN KEY (`postId`) REFERENCES `communityPosts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `communityReactions_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `community_reactions_user_post_emoji_unique` UNIQUE (`postId`, `userId`, `emoji`)
);

CREATE INDEX `community_reactions_post_idx` ON `communityReactions` (`postId`);

CREATE TABLE `communityComments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `authorUserId` int NOT NULL,
  `body` text NOT NULL,
  `moderationStatus` enum('approved','removed') NOT NULL DEFAULT 'approved',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `communityComments_pk` PRIMARY KEY (`id`),
  CONSTRAINT `communityComments_post_fk` FOREIGN KEY (`postId`) REFERENCES `communityPosts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `communityComments_author_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE INDEX `community_comments_post_idx` ON `communityComments` (`postId`, `createdAt`);
```

Run the migration using the existing project migration command after creating a database backup.

## 3. Add database helpers

Add these functions to `server/db.ts`. Keep the existing database client and query style used by that file; the imports below show the required symbols.

```ts
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { communityComments, communityPosts, communityReactions, userProfiles, users } from "../drizzle/schema";

const FEED_PAGE_SIZE = 10;
const ALLOWED_REACTIONS = ["❤️", "✨", "🔥", "😊", "💬", "👏"] as const;

export async function getCommunityFeed(input: { page: number; viewerUserId?: number }) {
  const page = Math.max(1, input.page);
  const offset = (page - 1) * FEED_PAGE_SIZE;

  const posts = await db.select({
    post: communityPosts,
    author: users,
    profile: userProfiles,
  })
    .from(communityPosts)
    .innerJoin(users, eq(users.id, communityPosts.authorUserId))
    .leftJoin(userProfiles, eq(userProfiles.userId, communityPosts.authorUserId))
    .where(and(
      eq(communityPosts.visibility, "community"),
      eq(communityPosts.moderationStatus, "approved"),
    ))
    .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
    .limit(FEED_PAGE_SIZE)
    .offset(offset);

  const postIds = posts.map((row) => row.post.id);
  if (!postIds.length) return { posts: [], page, hasMore: false };

  const [reactionRows, commentRows] = await Promise.all([
    db.select({ postId: communityReactions.postId, emoji: communityReactions.emoji, total: count() })
      .from(communityReactions)
      .where(inArray(communityReactions.postId, postIds))
      .groupBy(communityReactions.postId, communityReactions.emoji),
    db.select({ postId: communityComments.postId, total: count() })
      .from(communityComments)
      .where(and(inArray(communityComments.postId, postIds), eq(communityComments.moderationStatus, "approved")))
      .groupBy(communityComments.postId),
  ]);

  const selected = input.viewerUserId
    ? await db.select({ postId: communityReactions.postId, emoji: communityReactions.emoji })
      .from(communityReactions)
      .where(and(inArray(communityReactions.postId, postIds), eq(communityReactions.userId, input.viewerUserId)))
    : [];

  const reactionsByPost = new Map<number, { emoji: string; total: number; selected: boolean }[]>();
  for (const row of reactionRows) {
    const list = reactionsByPost.get(row.postId) ?? [];
    list.push({ emoji: row.emoji, total: Number(row.total), selected: selected.some((item) => item.postId === row.postId && item.emoji === row.emoji) });
    reactionsByPost.set(row.postId, list);
  }

  const commentsByPost = new Map(commentRows.map((row) => [row.postId, Number(row.total)]));
  return {
    posts: posts.map(({ post, author, profile }) => ({
      id: post.id,
      body: post.body,
      mediaUrl: post.mediaUrl,
      commentsEnabled: post.commentsEnabled,
      createdAt: post.createdAt,
      author: { id: author.id, name: profile?.displayName ?? author.name ?? "Member", city: profile?.city ?? null },
      reactions: reactionsByPost.get(post.id) ?? [],
      commentCount: commentsByPost.get(post.id) ?? 0,
      isOwner: input.viewerUserId === post.authorUserId,
    })),
    page,
    hasMore: posts.length === FEED_PAGE_SIZE,
  };
}

export async function createCommunityPost(input: { authorUserId: number; body: string; mediaUrl?: string | null; commentsEnabled: boolean; visibility: "community" | "connections" | "private" }) {
  if (!input.body.trim() || input.body.trim().length > 3000) throw new Error("Post text must be between 1 and 3000 characters.");
  const [created] = await db.insert(communityPosts).values({ ...input, body: input.body.trim() });
  return created.insertId;
}

export async function toggleCommunityReaction(input: { postId: number; userId: number; emoji: string }) {
  if (!(ALLOWED_REACTIONS as readonly string[]).includes(input.emoji)) throw new Error("Reaction is not supported.");
  const existing = await db.select({ id: communityReactions.id }).from(communityReactions).where(and(
    eq(communityReactions.postId, input.postId), eq(communityReactions.userId, input.userId), eq(communityReactions.emoji, input.emoji),
  )).limit(1);
  if (existing.length) await db.delete(communityReactions).where(eq(communityReactions.id, existing[0].id));
  else await db.insert(communityReactions).values(input);
  return getCommunityReactionSummary(input.postId, input.userId);
}

export async function getCommunityReactionSummary(postId: number, userId?: number) {
  const rows = await db.select({ emoji: communityReactions.emoji, total: count() }).from(communityReactions)
    .where(eq(communityReactions.postId, postId)).groupBy(communityReactions.emoji);
  const mine = userId ? await db.select({ emoji: communityReactions.emoji }).from(communityReactions)
    .where(and(eq(communityReactions.postId, postId), eq(communityReactions.userId, userId))) : [];
  return rows.map((row) => ({ emoji: row.emoji, total: Number(row.total), selected: mine.some((item) => item.emoji === row.emoji) }));
}

export async function addCommunityComment(input: { postId: number; authorUserId: number; body: string }) {
  const [post] = await db.select({ commentsEnabled: communityPosts.commentsEnabled }).from(communityPosts).where(eq(communityPosts.id, input.postId)).limit(1);
  if (!post?.commentsEnabled) throw new Error("Comments are disabled for this post.");
  const [created] = await db.insert(communityComments).values({ ...input, body: input.body.trim() });
  return created.insertId;
}

export async function setCommunityComments(input: { postId: number; authorUserId: number; enabled: boolean }) {
  await db.update(communityPosts).set({ commentsEnabled: input.enabled }).where(and(eq(communityPosts.id, input.postId), eq(communityPosts.authorUserId, input.authorUserId)));
}
```

## 4. Add tRPC procedures

Add a `community` router inside `appRouter` in `server/routers.ts`:

```ts
community: router({
  feed: protectedProcedure.input(z.object({ page: z.number().int().min(1).default(1) })).query(({ ctx, input }) =>
    db.getCommunityFeed({ page: input.page, viewerUserId: ctx.user.id })),

  create: protectedProcedure.input(z.object({
    body: z.string().trim().min(1).max(3000),
    mediaUrl: z.string().url().max(768).optional().nullable(),
    commentsEnabled: z.boolean().default(true),
    visibility: z.enum(["community", "connections", "private"]).default("community"),
  })).mutation(({ ctx, input }) => db.createCommunityPost({ ...input, authorUserId: ctx.user.id })),

  react: protectedProcedure.input(z.object({
    postId: z.number().int().positive(),
    emoji: z.string().min(1).max(16),
  })).mutation(({ ctx, input }) => db.toggleCommunityReaction({ ...input, userId: ctx.user.id })),

  comment: protectedProcedure.input(z.object({
    postId: z.number().int().positive(),
    body: z.string().trim().min(1).max(1000),
  })).mutation(({ ctx, input }) => db.addCommunityComment({ ...input, authorUserId: ctx.user.id })),

  setComments: protectedProcedure.input(z.object({
    postId: z.number().int().positive(),
    enabled: z.boolean(),
  })).mutation(({ ctx, input }) => db.setCommunityComments({ ...input, authorUserId: ctx.user.id })),
}),
```

For production, replace `z.string().url()` for `mediaUrl` with the same storage validation already used by the profile-media upload flow. Keep media private by default and serve it through an authorization-aware endpoint.

## 5. Add the route

In `client/src/App.tsx`:

```tsx
import CommunityFeed from "@/pages/CommunityFeed";
```

Add this route beside `/browse`:

```tsx
<Route path="/community" component={CommunityFeed} />
```

## 6. Add the community page

Create `client/src/pages/CommunityFeed.tsx`:

```tsx
import { useState } from "react";
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
  const utils = trpc.useUtils();
  const feed = trpc.community.feed.useQuery({ page });
  const createPost = trpc.community.create.useMutation({
    onSuccess: () => { setBody(""); utils.community.feed.invalidate(); toast.success("Your post is live."); },
    onError: (error) => toast.error(error.message),
  });
  const react = trpc.community.react.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error) => toast.error(error.message) });
  const comment = trpc.community.comment.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error) => toast.error(error.message) });
  const setComments = trpc.community.setComments.useMutation({ onSuccess: () => utils.community.feed.invalidate(), onError: (error) => toast.error(error.message) });

  function submitPost() {
    if (!body.trim()) return;
    createPost.mutate({ body, commentsEnabled, visibility: "community" });
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
          {feed.data?.posts.map((post) => <article className="post-card glass-panel" key={post.id}>
            <header className="post-header">
              <div className="avatar-placeholder" aria-hidden="true">{post.author.name.slice(0, 1).toUpperCase()}</div>
              <div><strong>{post.author.name}</strong><p>{post.author.city ?? "Private location"} · {formatDate(post.createdAt)}</p></div>
            </header>
            <p className="post-body">{post.body}</p>
            {post.mediaUrl && <img className="post-media" src={post.mediaUrl} alt="Community post" />}
            <div className="reaction-row" aria-label="Reactions">
              {post.reactions.map((reaction) => <button key={reaction.emoji} className={reaction.selected ? "reaction-chip selected" : "reaction-chip"} onClick={() => react.mutate({ postId: post.id, emoji: reaction.emoji })}>{reaction.emoji} {reaction.total}</button>)}
              {EMOJIS.filter((emoji) => !post.reactions.some((reaction) => reaction.emoji === emoji)).map((emoji) => <button key={emoji} className="reaction-add" onClick={() => react.mutate({ postId: post.id, emoji })} aria-label={`Add ${emoji} reaction`}>{emoji}</button>)}
              <span className="comment-count"><MessageCircle size={15} /> {post.commentCount}</span>
            </div>
            {post.commentsEnabled && <form className="comment-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const input = form.elements.namedItem("comment") as HTMLInputElement; if (input.value.trim()) { comment.mutate({ postId: post.id, body: input.value }); input.value = ""; } }}><input name="comment" placeholder="Write a respectful comment…" maxLength={1000} aria-label="Comment" /><button className="icon-button" aria-label="Send comment"><Send size={16} /></button></form>}
            {!post.commentsEnabled && <p className="comments-disabled">Comments are disabled by the author.</p>}
            {post.isOwner && <button className="privacy-button" onClick={() => setComments.mutate({ postId: post.id, enabled: !post.commentsEnabled })}>{post.commentsEnabled ? "Disable comments" : "Enable comments"}</button>}
          </article>)}

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
```

## 7. Replace the visual tokens

Update the color tokens in `client/src/index.css` and append the component styles below. Keep the existing utility imports and component styles.

```css
:root {
  --background: 314 45% 97%;
  --foreground: 270 28% 20%;
  --card: 0 0% 100%;
  --card-foreground: 270 28% 20%;
  --popover: 0 0% 100%;
  --popover-foreground: 270 28% 20%;
  --primary: 322 72% 54%;
  --primary-foreground: 0 0% 100%;
  --secondary: 272 52% 93%;
  --secondary-foreground: 270 28% 20%;
  --muted: 306 32% 94%;
  --muted-foreground: 270 12% 48%;
  --accent: 278 65% 91%;
  --accent-foreground: 270 28% 20%;
  --border: 286 34% 86%;
  --input: 286 34% 86%;
  --ring: 322 72% 54%;
}

body {
  background:
    radial-gradient(circle at 8% 4%, rgba(251, 187, 220, .7), transparent 32rem),
    radial-gradient(circle at 92% 20%, rgba(196, 177, 255, .55), transparent 34rem),
    linear-gradient(135deg, #fff7fc 0%, #f7efff 48%, #f2ecff 100%);
  color: hsl(var(--foreground));
}

.page-shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 42px 0 72px; }
.glass-panel { border: 1px solid rgba(255,255,255,.76); background: rgba(255,255,255,.66); box-shadow: 0 18px 60px rgba(98, 55, 117, .12), inset 0 1px rgba(255,255,255,.8); backdrop-filter: blur(20px); border-radius: 28px; }
.community-hero { display: flex; justify-content: space-between; gap: 24px; padding: clamp(28px, 6vw, 62px); background: linear-gradient(120deg, rgba(255,255,255,.75), rgba(247,220,245,.6)); }
.community-hero h1 { max-width: 700px; margin: 8px 0; font-family: "Playfair Display", Georgia, serif; font-size: clamp(2.2rem, 7vw, 5rem); line-height: .98; letter-spacing: -.05em; }
.muted-copy { max-width: 560px; color: hsl(var(--muted-foreground)); font-size: 1.05rem; }
.community-layout { display: grid; grid-template-columns: 250px minmax(0, 680px); justify-content: center; gap: 24px; margin-top: 26px; align-items: start; }
.community-sidebar { padding: 24px; position: sticky; top: 24px; }
.community-sidebar h2 { font-size: 1.05rem; margin: 16px 0 8px; }
.community-sidebar p { color: hsl(var(--muted-foreground)); line-height: 1.6; font-size: .9rem; }
.text-link, .privacy-button { color: #b42c7b; font-weight: 700; font-size: .86rem; background: none; border: 0; padding: 0; }
.feed-column { display: grid; gap: 16px; min-width: 0; }
.composer, .post-card { padding: 20px; }
.composer textarea { width: 100%; min-height: 110px; resize: vertical; border: 0; outline: 0; background: transparent; color: inherit; font-size: 1rem; }
.composer-footer, .post-header, .reaction-row, .comment-form, .feed-pagination { display: flex; align-items: center; gap: 10px; }
.composer-footer { justify-content: space-between; border-top: 1px solid rgba(130, 75, 145, .12); padding-top: 12px; }
.toggle-label { font-size: .84rem; color: hsl(var(--muted-foreground)); }
.primary-button, .secondary-button, .icon-button, .reaction-chip, .reaction-add { border: 0; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; }
.primary-button { padding: 11px 18px; color: white; background: linear-gradient(135deg, #d93691, #8759d8); box-shadow: 0 8px 20px rgba(176, 53, 137, .23); }
.secondary-button { padding: 10px 15px; background: rgba(255,255,255,.75); color: #703f91; }
.avatar-placeholder { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; color: white; background: linear-gradient(135deg, #db6aa9, #8c79dc); font-weight: 800; }
.post-header strong { font-size: .95rem; }
.post-header p { margin: 3px 0 0; color: hsl(var(--muted-foreground)); font-size: .78rem; }
.post-body { white-space: pre-wrap; line-height: 1.65; margin: 18px 0; }
.post-media { width: 100%; max-height: 460px; object-fit: cover; border-radius: 18px; }
.reaction-row { flex-wrap: wrap; border-top: 1px solid rgba(130, 75, 145, .12); padding-top: 14px; }
.reaction-chip { padding: 7px 10px; background: rgba(243, 226, 247, .9); color: #643b78; }
.reaction-chip.selected { outline: 2px solid #d93691; background: #fff; }
.reaction-add { width: 31px; height: 31px; background: rgba(255,255,255,.72); }
.comment-count { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; color: hsl(var(--muted-foreground)); font-size: .82rem; }
.comment-form { margin-top: 14px; }
.comment-form input { flex: 1; min-width: 0; border: 1px solid rgba(130, 75, 145, .17); border-radius: 999px; padding: 10px 14px; background: rgba(255,255,255,.7); outline-color: #d93691; }
.icon-button { width: 36px; height: 36px; background: #eadcf7; color: #78449a; }
.comments-disabled { color: hsl(var(--muted-foreground)); font-size: .82rem; }
.privacy-button { margin-top: 12px; }
.empty-state { padding: 40px; text-align: center; color: hsl(var(--muted-foreground)); }
.feed-pagination { justify-content: center; padding: 8px 0; color: hsl(var(--muted-foreground)); font-size: .86rem; }

@media (max-width: 760px) {
  .page-shell { width: min(100% - 20px, 680px); padding-top: 20px; }
  .community-layout { grid-template-columns: 1fr; }
  .community-sidebar { position: static; }
  .community-hero { padding: 28px 22px; }
  .community-hero h1 { font-size: 2.7rem; }
  .composer, .post-card { padding: 16px; border-radius: 22px; }
  .composer-footer { align-items: flex-start; flex-direction: column; }
  .primary-button { width: 100%; }
}
```

## 8. Preserve existing pages and improve discovery

Keep these existing routes intact:

- `/`
- `/browse`
- `/guides`
- `/listing/:id`
- `/profile`
- `/member/:id`
- `/post`
- `/inbox`
- `/report/listing/:id`
- `/safety`
- `/studio`

For `/browse`, use the same glass-panel language, but do not remove the existing category, city, verification, or listing-query behavior. Add these UI capabilities around the existing query controls:

```tsx
const DISCOVERY_FILTERS = [
  { label: "Verified members", value: "verified" },
  { label: "Near my city", value: "nearby" },
  { label: "Recently active", value: "active" },
  { label: "New listings", value: "new" },
] as const;
```

Display the existing listings as responsive cards with a featured media area, verification badge, age/city summary, category badge, short description, and privacy-safe actions. Never show a street address, exact coordinates, private media, or contact details in browse results.

## 9. Safety and moderation requirements

Before production release:

1. Keep the existing age gate and verification rules.
2. Add a report action to each community post and comment.
3. Apply existing rate limiting to post, reaction, and comment mutations.
4. Sanitize rendered text and reject HTML/script content server-side.
5. Keep comments and reactions available only to authenticated, active, adult users.
6. Add admin moderation views for pending/removed community content.
7. Keep posts finite and paginated; do not add an auto-loading scroll listener.
8. Add automated tests for comment disabling, reaction uniqueness, pagination, ownership checks, and suspended users.

## 10. Deployment checklist

```bash
pnpm install
pnpm run check
pnpm test
pnpm drizzle-kit migrate
pnpm build
docker compose build --no-cache app
docker compose up -d app
```

Then verify:

- Existing routes still load.
- `/community` requires authentication and the adult gate.
- Page 1 and page 2 do not duplicate posts.
- Multiple users can select the same emoji, but one user cannot duplicate their own emoji reaction.
- The post owner can disable and re-enable comments.
- Disabled comments reject new writes on the server, not only in the browser.
- Removed or suspended users cannot publish, comment, or react.
- No secret values are committed to Git or included in the Docker image.