import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { CATEGORY_REQUIREMENTS, canPublishInCategory, isCityLevelLocation, LISTING_CATEGORIES } from "../shared/platformRules";
import * as controls from "./platformControls";
import * as db from "./db";
import * as community from "./community";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Restricted workspace" });
  return next();
});

const limitAction = async (userId: number, actionType: controls.LimitedAction, maximum: number) => {
  if (!await controls.consumeActionLimit({ userId, actionType, maximum })) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Please pause before taking further ${actionType} actions.` });
  }
};

const profileInput = z.object({
  displayName: z.string().trim().max(48).optional().nullable(),
  bio: z.string().trim().max(1200).optional().nullable(),
  age: z.number().int().min(18).max(99),
  city: z.string().trim().min(2).max(80).refine(isCityLevelLocation, "Use a city or metro area only; do not enter a street address or coordinates."),
  preferences: z.array(z.string().trim().min(1).max(40)).max(12),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    mine: protectedProcedure.query(async ({ ctx }) => (await db.getMyProfile(ctx.user.id)) ?? null),
    get: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => {
      const profile = await db.getPublicProfile(input.userId);
      return profile ? { ...profile, media: await db.getPublicProfileMedia(input.userId) } : null;
    }),
    media: protectedProcedure.query(({ ctx }) => db.getProfileMedia(ctx.user.id)),
    deleteMedia: protectedProcedure.input(z.object({ mediaId: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteProfileMedia(ctx.user.id, input.mediaId)),
    updateMedia: protectedProcedure.input(z.object({ mediaId: z.number().int().positive(), visibility: z.enum(["public", "hidden"]).optional(), featured: z.boolean().optional() })).mutation(({ ctx, input }) => db.updateProfileMedia(ctx.user.id, input.mediaId, { visibility: input.visibility, featured: input.featured })),
    reorderMedia: protectedProcedure.input(z.object({ mediaIds: z.array(z.number().int().positive()).min(1).max(8).refine((mediaIds) => new Set(mediaIds).size === mediaIds.length, "Each media item can appear only once in an order.") })).mutation(({ ctx, input }) => db.reorderProfileMedia(ctx.user.id, input.mediaIds)),
    save: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => db.saveMyProfile({ ...input, userId: ctx.user.id })),
  }),
  listings: router({
    browse: publicProcedure.input(z.object({ category: z.enum(LISTING_CATEGORIES).optional(), city: z.string().trim().max(80).optional(), query: z.string().trim().max(120).optional() })).query(({ input }) => db.getListings(input)),
    get: publicProcedure.input(z.object({ listingId: z.number().int().positive() })).query(async ({ input }) => (await db.getApprovedListing(input.listingId)) ?? null),
    create: protectedProcedure.input(z.object({ title: z.string().trim().min(4).max(120), description: z.string().trim().min(24).max(3000), category: z.enum(LISTING_CATEGORIES), city: z.string().trim().min(2).max(80).refine(isCityLevelLocation, "Use a city or metro area only; do not enter a street address or coordinates.") })).mutation(async ({ ctx, input }) => {
      await limitAction(ctx.user.id, "listing", 3);
      const profile = await db.getMyProfile(ctx.user.id);
      if (!profile || profile.age < 18) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete an adult profile before publishing." });
      if (profile.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Your account is currently unavailable for publishing." });
      const rule = canPublishInCategory(input.category, profile.verificationStatus);
      if (!rule.allowed) throw new TRPCError({ code: "FORBIDDEN", message: rule.reason });
      await db.createListing({ ...input, ownerUserId: ctx.user.id, verificationRequired: CATEGORY_REQUIREMENTS[input.category] });
      return { success: true };
    }),
  }),
  community: router({
    feed: protectedProcedure.input(z.object({ page: z.number().int().min(1).default(1) })).query(({ ctx, input }) => community.getCommunityFeed({ page: input.page, viewerUserId: ctx.user.id })),
    create: protectedProcedure.input(z.object({ body: z.string().trim().min(1).max(3000), mediaUrl: z.string().url().max(768).optional().nullable(), commentsEnabled: z.boolean().default(true), visibility: z.enum(["community", "connections", "private"]).default("community") })).mutation(async ({ ctx, input }) => { await limitAction(ctx.user.id, "listing", 10); return community.createCommunityPost({ ...input, authorUserId: ctx.user.id }); }),
    react: protectedProcedure.input(z.object({ postId: z.number().int().positive(), emoji: z.string().min(1).max(16) })).mutation(async ({ ctx, input }) => { await limitAction(ctx.user.id, "message", 60); return community.toggleCommunityReaction({ ...input, userId: ctx.user.id }); }),
    comment: protectedProcedure.input(z.object({ postId: z.number().int().positive(), body: z.string().trim().min(1).max(1000) })).mutation(async ({ ctx, input }) => { await limitAction(ctx.user.id, "message", 20); return community.addCommunityComment({ ...input, authorUserId: ctx.user.id }); }),
    setComments: protectedProcedure.input(z.object({ postId: z.number().int().positive(), enabled: z.boolean() })).mutation(({ ctx, input }) => community.setCommunityComments({ ...input, authorUserId: ctx.user.id })),
  }),
  safety: router({
    signal: protectedProcedure.input(z.object({ subjectUserId: z.number().int().positive().optional(), listingId: z.number().int().positive().optional(), signalType: z.enum(["safe_contact", "safety_alert"]), note: z.string().trim().max(1000).optional() }).refine((value) => value.subjectUserId || value.listingId, "Choose a profile or listing.")).mutation(async ({ ctx, input }) => { await limitAction(ctx.user.id, "safety", 12); return db.createSafetySignal({ ...input, reporterUserId: ctx.user.id }); }),
    report: protectedProcedure.input(z.object({ subjectUserId: z.number().int().positive().optional(), listingId: z.number().int().positive().optional(), category: z.enum(["harassment", "misrepresentation", "prohibited_content", "underage_concern", "safety_concern", "other"]), detail: z.string().trim().min(10).max(1500) }).refine((value) => value.subjectUserId || value.listingId, "Choose a profile or listing.")).mutation(async ({ ctx, input }) => { await limitAction(ctx.user.id, "report", 12); return db.createReport({ ...input, reporterUserId: ctx.user.id }); }),
    mine: protectedProcedure.query(({ ctx }) => db.getMyReports(ctx.user.id)),
  }),
  messaging: router({
    inbox: protectedProcedure.query(({ ctx }) => db.getInbox(ctx.user.id)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => db.getConversationMessages(ctx.user.id, input.conversationId)),
    send: protectedProcedure.input(z.object({ recipientUserId: z.number().int().positive(), body: z.string().trim().min(1).max(3000) })).mutation(async ({ ctx, input }) => { await limitAction(ctx.user.id, "message", 20); if (ctx.user.id === input.recipientUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot message yourself." }); const [senderProfile, recipientProfile] = await Promise.all([db.getMyProfile(ctx.user.id), db.getMyProfile(input.recipientUserId)]); if (!senderProfile || !recipientProfile || senderProfile.accountStatus !== "active" || recipientProfile.accountStatus !== "active" || senderProfile.verificationStatus === "none" || recipientProfile.verificationStatus === "none") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Private messaging is currently unavailable for one or both members." }); return db.sendMessage({ ...input, senderUserId: ctx.user.id }); }),
  }),
  admin: router({
    members: adminProcedure.query(() => controls.getAdminMembersWithAccounts()), dashboard: adminProcedure.query(() => db.getAdminDashboard()), safetyAlerts: adminProcedure.query(() => controls.getAdminSafetyAlerts()),
    moderateListing: adminProcedure.input(z.object({ listingId: z.number().int().positive(), action: z.enum(["approve", "flag", "remove"]), note: z.string().trim().max(1000).optional() })).mutation(({ ctx, input }) => db.moderateListing({ ...input, adminUserId: ctx.user.id })),
    updateReport: adminProcedure.input(z.object({ reportId: z.number().int().positive(), status: z.enum(["received", "under_review", "action_taken", "closed"]), reporterUpdate: z.string().trim().max(1000).optional() })).mutation(({ ctx, input }) => db.updateReport({ ...input, adminUserId: ctx.user.id })),
    updateSafetyAlert: adminProcedure.input(z.object({ alertId: z.number().int().positive(), status: z.enum(["received", "under_review", "resolved"]), note: z.string().trim().max(1000).optional() })).mutation(({ ctx, input }) => controls.updateSafetyAlert({ ...input, adminUserId: ctx.user.id })),
    setVerification: adminProcedure.input(z.object({ userId: z.number().int().positive(), status: z.enum(["none", "email", "id"]) })).mutation(({ ctx, input }) => db.setVerificationStatus({ ...input, adminUserId: ctx.user.id })),
    setAccountStatus: adminProcedure.input(z.object({ userId: z.number().int().positive(), status: z.enum(["active", "review", "suspended"]) })).mutation(({ ctx, input }) => controls.setAccountStatus({ ...input, adminUserId: ctx.user.id })),
  }),
});

export type AppRouter = typeof appRouter;