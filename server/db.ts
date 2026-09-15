import { and, count, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  conversationParticipants,
  conversations,
  listings,
  messages,
  moderationActions,
  profileMedia,
  reports,
  safetySignals,
  type InsertUser,
  userProfiles,
  users,
} from "../drizzle/schema";
import type {
  ListingCategory,
  VerificationStatus,
} from "../shared/platformRules";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (
    await db.select().from(users).where(eq(users.openId, openId)).limit(1)
  )[0];
}

export async function getMyProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (
    await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)
  )[0];
}

export async function getPublicProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (
    await db
      .select({
        userId: userProfiles.userId,
        displayName: userProfiles.displayName,
        bio: userProfiles.bio,
        age: userProfiles.age,
        city: userProfiles.city,
        preferences: userProfiles.preferences,
        verificationStatus: userProfiles.verificationStatus,
        createdAt: userProfiles.createdAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)
  )[0];
}

export async function getProfileMedia(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: profileMedia.id,
      url: profileMedia.url,
      mediaType: profileMedia.mediaType,
      mimeType: profileMedia.mimeType,
      caption: profileMedia.caption,
      visibility: profileMedia.visibility,
      isFeatured: profileMedia.isFeatured,
      sortOrder: profileMedia.sortOrder,
      createdAt: profileMedia.createdAt,
    })
    .from(profileMedia)
    .where(eq(profileMedia.userId, userId))
    .orderBy(profileMedia.sortOrder, desc(profileMedia.createdAt));
}

export async function getPublicProfileMedia(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: profileMedia.id,
      url: profileMedia.url,
      mediaType: profileMedia.mediaType,
      mimeType: profileMedia.mimeType,
      caption: profileMedia.caption,
      isFeatured: profileMedia.isFeatured,
      sortOrder: profileMedia.sortOrder,
      createdAt: profileMedia.createdAt,
    })
    .from(profileMedia)
    .where(
      and(
        eq(profileMedia.userId, userId),
        eq(profileMedia.visibility, "public")
      )
    )
    .orderBy(profileMedia.sortOrder, desc(profileMedia.createdAt));
}

export function isExactMediaOrder(
  ownedMediaIds: number[],
  orderedMediaIds: number[]
) {
  return (
    ownedMediaIds.length === orderedMediaIds.length &&
    new Set(orderedMediaIds).size === orderedMediaIds.length &&
    orderedMediaIds.every(mediaId => ownedMediaIds.includes(mediaId))
  );
}

type SortableMedia = { id: number; sortOrder: number; createdAt: Date };

export function getNormalizedMediaSortOrders(media: SortableMedia[]) {
  return [...media]
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        right.createdAt.getTime() - left.createdAt.getTime()
    )
    .map((item, sortOrder) => ({ id: item.id, sortOrder }));
}

export function getNextMediaSortOrder(
  media: Pick<SortableMedia, "sortOrder">[]
) {
  return (
    media.reduce((largest, item) => Math.max(largest, item.sortOrder), -1) + 1
  );
}

async function normalizeProfileMediaOrder(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await db
    .select({
      id: profileMedia.id,
      sortOrder: profileMedia.sortOrder,
      createdAt: profileMedia.createdAt,
    })
    .from(profileMedia)
    .where(eq(profileMedia.userId, userId))
    .orderBy(profileMedia.sortOrder, desc(profileMedia.createdAt));
  const normalized = getNormalizedMediaSortOrders(current);
  for (const item of normalized)
    if (
      current.find(media => media.id === item.id)?.sortOrder !== item.sortOrder
    )
      await db
        .update(profileMedia)
        .set({ sortOrder: item.sortOrder })
        .where(
          and(eq(profileMedia.id, item.id), eq(profileMedia.userId, userId))
        );
}

export async function reorderProfileMedia(
  userId: number,
  orderedMediaIds: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const owned = await db
    .select({ id: profileMedia.id })
    .from(profileMedia)
    .where(eq(profileMedia.userId, userId))
    .orderBy(profileMedia.sortOrder, desc(profileMedia.createdAt));
  if (
    !isExactMediaOrder(
      owned.map(item => item.id),
      orderedMediaIds
    )
  )
    throw new Error(
      "Submit each of your profile media items exactly once when changing gallery order."
    );
  await db
    .update(profileMedia)
    .set({ isFeatured: false })
    .where(eq(profileMedia.userId, userId));
  for (let sortOrder = 0; sortOrder < orderedMediaIds.length; sortOrder += 1)
    await db
      .update(profileMedia)
      .set({ sortOrder })
      .where(
        and(
          eq(profileMedia.id, orderedMediaIds[sortOrder]),
          eq(profileMedia.userId, userId)
        )
      );
  await db
    .update(profileMedia)
    .set({ isFeatured: true })
    .where(
      and(
        eq(profileMedia.id, orderedMediaIds[0]),
        eq(profileMedia.userId, userId)
      )
    );
  return getProfileMedia(userId);
}

export async function createProfileMedia(input: {
  userId: number;
  storageKey: string;
  url: string;
  mediaType: "image" | "video";
  mimeType: string;
  caption?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: profileMedia.id, sortOrder: profileMedia.sortOrder })
    .from(profileMedia)
    .where(eq(profileMedia.userId, input.userId));
  if (existing.length >= 8)
    throw new Error("A profile can contain up to 8 photos and videos.");
  await db.insert(profileMedia).values({
    ...input,
    caption: input.caption ?? null,
    sortOrder: getNextMediaSortOrder(existing),
    visibility: "public",
    isFeatured: existing.length === 0,
  });
  return getProfileMedia(input.userId);
}

export async function updateProfileMedia(
  userId: number,
  mediaId: number,
  input: { visibility?: "public" | "hidden"; featured?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.featured) {
    if (input.visibility)
      await db
        .update(profileMedia)
        .set({ visibility: input.visibility })
        .where(
          and(eq(profileMedia.id, mediaId), eq(profileMedia.userId, userId))
        );
    const owned = await db
      .select({ id: profileMedia.id })
      .from(profileMedia)
      .where(eq(profileMedia.userId, userId))
      .orderBy(profileMedia.sortOrder, desc(profileMedia.createdAt));
    if (!owned.some(item => item.id === mediaId))
      return getProfileMedia(userId);
    return reorderProfileMedia(userId, [
      mediaId,
      ...owned.filter(item => item.id !== mediaId).map(item => item.id),
    ]);
  }
  const updates: { visibility?: "public" | "hidden"; isFeatured?: boolean } =
    {};
  if (input.visibility) updates.visibility = input.visibility;
  if (input.featured !== undefined) updates.isFeatured = input.featured;
  if (Object.keys(updates).length)
    await db
      .update(profileMedia)
      .set(updates)
      .where(
        and(eq(profileMedia.id, mediaId), eq(profileMedia.userId, userId))
      );
  return getProfileMedia(userId);
}

export async function deleteProfileMedia(userId: number, mediaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(profileMedia)
    .where(and(eq(profileMedia.id, mediaId), eq(profileMedia.userId, userId)));
  await normalizeProfileMediaOrder(userId);
  return getProfileMedia(userId);
}

export async function saveMyProfile(input: {
  userId: number;
  displayName?: string | null;
  bio?: string | null;
  age: number;
  city: string;
  preferences: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(userProfiles)
    .values(input)
    .onDuplicateKeyUpdate({
      set: {
        displayName: input.displayName ?? null,
        bio: input.bio ?? null,
        age: input.age,
        city: input.city,
        preferences: input.preferences,
      },
    });
  return getMyProfile(input.userId);
}

export async function getListings(input: {
  category?: ListingCategory;
  city?: string;
  query?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(listings.visibility, "live")];
  if (input.category) conditions.push(eq(listings.category, input.category));
  if (input.city) conditions.push(eq(listings.city, input.city));
  if (input.query) {
    const term = `%${input.query.trim()}%`;
    conditions.push(
      or(like(listings.title, term), like(listings.description, term))!
    );
  }
  return db
    .select({
      id: listings.id,
      ownerUserId: listings.ownerUserId,
      title: listings.title,
      description: listings.description,
      category: listings.category,
      city: listings.city,
      verificationRequired: listings.verificationRequired,
      moderationStatus: listings.moderationStatus,
      publishedAt: listings.publishedAt,
      displayName: userProfiles.displayName,
      verificationStatus: userProfiles.verificationStatus,
    })
    .from(listings)
    .leftJoin(userProfiles, eq(listings.ownerUserId, userProfiles.userId))
    .where(and(...conditions))
    .orderBy(desc(listings.publishedAt))
    .limit(40);
}

export async function getApprovedListing(listingId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (
    await db
      .select({
        id: listings.id,
        ownerUserId: listings.ownerUserId,
        title: listings.title,
        description: listings.description,
        category: listings.category,
        city: listings.city,
        verificationRequired: listings.verificationRequired,
        publishedAt: listings.publishedAt,
        updatedAt: listings.updatedAt,
        displayName: userProfiles.displayName,
        verificationStatus: userProfiles.verificationStatus,
      })
      .from(listings)
      .leftJoin(userProfiles, eq(listings.ownerUserId, userProfiles.userId))
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.visibility, "live"),
          eq(listings.moderationStatus, "approved")
        )
      )
      .limit(1)
  )[0];
}

export async function getApprovedListingIds() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(
        eq(listings.visibility, "live"),
        eq(listings.moderationStatus, "approved")
      )
    )
    .orderBy(desc(listings.updatedAt))
    .limit(500);
}

export async function createListing(input: {
  ownerUserId: number;
  title: string;
  description: string;
  category: ListingCategory;
  city: string;
  verificationRequired: VerificationStatus;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(listings)
    .values({ ...input, visibility: "live", moderationStatus: "unreviewed" });
}

export async function createSafetySignal(input: {
  reporterUserId: number;
  subjectUserId?: number;
  listingId?: number;
  signalType: "safe_contact" | "safety_alert";
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(safetySignals).values(input);
}

export async function createReport(input: {
  reporterUserId: number;
  subjectUserId?: number;
  listingId?: number;
  category:
    | "harassment"
    | "misrepresentation"
    | "prohibited_content"
    | "underage_concern"
    | "safety_concern"
    | "other";
  detail: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(reports).values(input);
}

export async function getMyReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reports)
    .where(eq(reports.reporterUserId, userId))
    .orderBy(desc(reports.updatedAt));
}

export async function sendMessage(input: {
  senderUserId: number;
  recipientUserId: number;
  body: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [lowestId, highestId] = [
    input.senderUserId,
    input.recipientUserId,
  ].sort((a, b) => a - b);
  const threadKey = `pair-${lowestId}-${highestId}`;
  await db
    .insert(conversations)
    .values({ threadKey })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const conversation = (
    await db
      .select()
      .from(conversations)
      .where(eq(conversations.threadKey, threadKey))
      .limit(1)
  )[0];
  if (!conversation) throw new Error("Conversation could not be created");
  for (const userId of [input.senderUserId, input.recipientUserId])
    await db
      .insert(conversationParticipants)
      .values({ conversationId: conversation.id, userId })
      .onDuplicateKeyUpdate({
        set: { userId: sql`${conversationParticipants.userId}` },
      });
  await db.insert(messages).values({
    conversationId: conversation.id,
    senderUserId: input.senderUserId,
    body: input.body,
  });
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id));
  return conversation.id;
}

export async function getInbox(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const memberships = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
  const ids = memberships.map(entry => entry.conversationId);
  if (!ids.length) return [];
  const threads = await db
    .select()
    .from(conversations)
    .where(inArray(conversations.id, ids))
    .orderBy(desc(conversations.updatedAt));
  return Promise.all(
    threads.map(async thread => {
      const participant = (
        await db
          .select({
            userId: conversationParticipants.userId,
            displayName: userProfiles.displayName,
          })
          .from(conversationParticipants)
          .leftJoin(
            userProfiles,
            eq(conversationParticipants.userId, userProfiles.userId)
          )
          .where(
            and(
              eq(conversationParticipants.conversationId, thread.id),
              ne(conversationParticipants.userId, userId)
            )
          )
          .limit(1)
      )[0];
      const latestMessage = (
        await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, thread.id))
          .orderBy(desc(messages.createdAt))
          .limit(1)
      )[0];
      return {
        ...thread,
        otherUserId: participant?.userId,
        otherDisplayName: participant?.displayName,
        latestMessage,
      };
    })
  );
}

export async function getConversationMessages(
  userId: number,
  conversationId: number
) {
  const db = await getDb();
  if (!db) return [];
  const membership = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    )
    .limit(1);
  if (!membership[0]) throw new Error("Conversation access denied");
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function getAdminDashboard() {
  const db = await getDb();
  if (!db)
    return {
      metrics: { members: 0, liveListings: 0, openReports: 0, alerts: 0 },
      queue: [],
      reports: [],
    };
  const [members] = await db.select({ value: count() }).from(users);
  const [liveListings] = await db
    .select({ value: count() })
    .from(listings)
    .where(eq(listings.visibility, "live"));
  const [openReports] = await db
    .select({ value: count() })
    .from(reports)
    .where(
      or(eq(reports.status, "received"), eq(reports.status, "under_review"))!
    );
  const [alerts] = await db
    .select({ value: count() })
    .from(safetySignals)
    .where(
      and(
        eq(safetySignals.signalType, "safety_alert"),
        ne(safetySignals.status, "resolved")
      )
    );
  const queue = await db
    .select({
      id: listings.id,
      title: listings.title,
      category: listings.category,
      city: listings.city,
      visibility: listings.visibility,
      moderationStatus: listings.moderationStatus,
      publishedAt: listings.publishedAt,
      ownerUserId: listings.ownerUserId,
      displayName: userProfiles.displayName,
    })
    .from(listings)
    .leftJoin(userProfiles, eq(listings.ownerUserId, userProfiles.userId))
    .where(eq(listings.moderationStatus, "unreviewed"))
    .orderBy(desc(listings.publishedAt))
    .limit(30);
  const reportRows = await db
    .select()
    .from(reports)
    .where(
      or(eq(reports.status, "received"), eq(reports.status, "under_review"))!
    )
    .orderBy(desc(reports.updatedAt))
    .limit(30);
  return {
    metrics: {
      members: members?.value ?? 0,
      liveListings: liveListings?.value ?? 0,
      openReports: openReports?.value ?? 0,
      alerts: alerts?.value ?? 0,
    },
    queue,
    reports: reportRows,
  };
}

export async function moderateListing(input: {
  adminUserId: number;
  listingId: number;
  action: "approve" | "flag" | "remove";
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const update =
    input.action === "approve"
      ? { moderationStatus: "approved" as const, visibility: "live" as const }
      : input.action === "flag"
        ? { moderationStatus: "flagged" as const, visibility: "live" as const }
        : {
            moderationStatus: "rejected" as const,
            visibility: "removed" as const,
          };
  await db.update(listings).set(update).where(eq(listings.id, input.listingId));
  await db.insert(moderationActions).values({
    adminUserId: input.adminUserId,
    listingId: input.listingId,
    actionType: `listing_${input.action}`,
    note: input.note,
  });
}

export async function updateReport(input: {
  adminUserId: number;
  reportId: number;
  status: "received" | "under_review" | "action_taken" | "closed";
  reporterUpdate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(reports)
    .set({ status: input.status, reporterUpdate: input.reporterUpdate ?? null })
    .where(eq(reports.id, input.reportId));
  await db.insert(moderationActions).values({
    adminUserId: input.adminUserId,
    reportId: input.reportId,
    actionType: `report_${input.status}`,
    note: input.reporterUpdate,
  });
}

export async function getAdminMembers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      lastSignedIn: users.lastSignedIn,
      displayName: userProfiles.displayName,
      city: userProfiles.city,
      verificationStatus: userProfiles.verificationStatus,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .orderBy(desc(users.lastSignedIn))
    .limit(50);
}

export async function setVerificationStatus(input: {
  adminUserId: number;
  userId: number;
  status: "none" | "email" | "id";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await getMyProfile(input.userId);
  if (!profile)
    throw new Error(
      "The member must complete a profile before a verification status can be set."
    );
  await db
    .update(userProfiles)
    .set({ verificationStatus: input.status })
    .where(eq(userProfiles.userId, input.userId));
  await db.insert(moderationActions).values({
    adminUserId: input.adminUserId,
    targetUserId: input.userId,
    actionType: `verification_${input.status}`,
    note: "Verification status updated in Studio.",
  });
}
