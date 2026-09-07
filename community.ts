import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  communityComments,
  communityPosts,
  communityReactions,
  userProfiles,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

const PAGE_SIZE = 10;
const ALLOWED_REACTIONS = ["❤️", "✨", "🔥", "😊", "💬", "👏"] as const;

type Visibility = "community" | "connections" | "private";

export async function getCommunityFeed(input: { page: number; viewerUserId: number }) {
  const database = await getDb();
  if (!database) return { posts: [], page: input.page, hasMore: false };

  const page = Math.max(1, input.page);
  const rows = await database
    .select({ post: communityPosts, author: users, profile: userProfiles })
    .from(communityPosts)
    .innerJoin(users, eq(users.id, communityPosts.authorUserId))
    .leftJoin(userProfiles, eq(userProfiles.userId, communityPosts.authorUserId))
    .where(and(
      eq(communityPosts.visibility, "community"),
      eq(communityPosts.moderationStatus, "approved"),
    ))
    .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const ids = rows.map(({ post }) => post.id);
  if (!ids.length) return { posts: [], page, hasMore: false };

  const [reactionRows, commentRows, selectedRows] = await Promise.all([
    database.select({ postId: communityReactions.postId, emoji: communityReactions.emoji, total: count() })
      .from(communityReactions)
      .where(inArray(communityReactions.postId, ids))
      .groupBy(communityReactions.postId, communityReactions.emoji),
    database.select({ postId: communityComments.postId, total: count() })
      .from(communityComments)
      .where(and(inArray(communityComments.postId, ids), eq(communityComments.moderationStatus, "approved")))
      .groupBy(communityComments.postId),
    database.select({ postId: communityReactions.postId, emoji: communityReactions.emoji })
      .from(communityReactions)
      .where(and(inArray(communityReactions.postId, ids), eq(communityReactions.userId, input.viewerUserId))),
  ]);

  return {
    posts: rows.map(({ post, author, profile }) => ({
      id: post.id,
      body: post.body,
      mediaUrl: post.mediaUrl,
      commentsEnabled: post.commentsEnabled,
      createdAt: post.createdAt,
      author: {
        id: author.id,
        name: profile?.displayName ?? author.name ?? "Member",
        city: profile?.city ?? null,
      },
      reactions: reactionRows
        .filter((reaction) => reaction.postId === post.id)
        .map((reaction) => ({
          emoji: reaction.emoji,
          total: Number(reaction.total),
          selected: selectedRows.some((selected) => selected.postId === post.id && selected.emoji === reaction.emoji),
        })),
      commentCount: Number(commentRows.find((comment) => comment.postId === post.id)?.total ?? 0),
      isOwner: post.authorUserId === input.viewerUserId,
    })),
    page,
    hasMore: rows.length === PAGE_SIZE,
  };
}

export async function createCommunityPost(input: {
  authorUserId: number;
  body: string;
  mediaUrl?: string | null;
  commentsEnabled: boolean;
  visibility: Visibility;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  const body = input.body.trim();
  if (!body || body.length > 3000) throw new Error("Post text must be between 1 and 3000 characters.");
  const [profile] = await database.select({ age: userProfiles.age, accountStatus: userProfiles.accountStatus })
    .from(userProfiles).where(eq(userProfiles.userId, input.authorUserId)).limit(1);
  if (!profile || profile.age < 18 || profile.accountStatus !== "active") throw new Error("An active adult profile is required.");
  const result = await database.insert(communityPosts).values({ ...input, body, mediaUrl: input.mediaUrl ?? null });
  return { id: result[0].insertId };
}

export async function toggleCommunityReaction(input: { postId: number; userId: number; emoji: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  if (!(ALLOWED_REACTIONS as readonly string[]).includes(input.emoji)) throw new Error("Reaction is not supported.");
  const existing = await database.select({ id: communityReactions.id }).from(communityReactions).where(and(
    eq(communityReactions.postId, input.postId),
    eq(communityReactions.userId, input.userId),
    eq(communityReactions.emoji, input.emoji),
  )).limit(1);
  if (existing.length) await database.delete(communityReactions).where(eq(communityReactions.id, existing[0].id));
  else await database.insert(communityReactions).values(input);
  return getCommunityFeed({ page: 1, viewerUserId: input.userId });
}

export async function addCommunityComment(input: { postId: number; authorUserId: number; body: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  const body = input.body.trim();
  if (!body || body.length > 1000) throw new Error("Comment must be between 1 and 1000 characters.");
  const [post] = await database.select({ commentsEnabled: communityPosts.commentsEnabled })
    .from(communityPosts).where(and(eq(communityPosts.id, input.postId), eq(communityPosts.moderationStatus, "approved"))).limit(1);
  if (!post) throw new Error("Post not found.");
  if (!post.commentsEnabled) throw new Error("Comments are disabled for this post.");
  const [profile] = await database.select({ age: userProfiles.age, accountStatus: userProfiles.accountStatus })
    .from(userProfiles).where(eq(userProfiles.userId, input.authorUserId)).limit(1);
  if (!profile || profile.age < 18 || profile.accountStatus !== "active") throw new Error("An active adult profile is required.");
  const result = await database.insert(communityComments).values({ ...input, body, moderationStatus: "approved" });
  return { id: result[0].insertId };
}

export async function setCommunityComments(input: { postId: number; authorUserId: number; enabled: boolean }) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  await database.update(communityPosts)
    .set({ commentsEnabled: input.enabled })
    .where(and(eq(communityPosts.id, input.postId), eq(communityPosts.authorUserId, input.authorUserId)));
  return { success: true };
}