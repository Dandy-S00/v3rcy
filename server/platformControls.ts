import { and, desc, eq, ne } from "drizzle-orm";
import { actionRateLimits, moderationActions, safetySignals, userProfiles, users } from "../drizzle/schema";
import { getDb } from "./db";

export type LimitedAction = "listing" | "message" | "report" | "safety" | "upload";
export type AccountStatus = "active" | "review" | "suspended";

export function nextRateLimitState(input: { existing: { actionCount: number; windowStartedAt: Date } | undefined; maximum: number; now: Date; windowMs: number }) {
  if (!input.existing) return { allowed: true, actionCount: 1, windowStartedAt: input.now };
  const windowExpired = input.now.getTime() - input.existing.windowStartedAt.getTime() >= input.windowMs;
  if (!windowExpired && input.existing.actionCount >= input.maximum) return { allowed: false, actionCount: input.existing.actionCount, windowStartedAt: input.existing.windowStartedAt };
  return { allowed: true, actionCount: windowExpired ? 1 : input.existing.actionCount + 1, windowStartedAt: windowExpired ? input.now : input.existing.windowStartedAt };
}

export async function consumeActionLimit(input: { userId: number; actionType: LimitedAction; maximum: number; windowMs?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const existing = (await db.select().from(actionRateLimits).where(and(eq(actionRateLimits.userId, input.userId), eq(actionRateLimits.actionType, input.actionType))).limit(1))[0];
  const next = nextRateLimitState({ existing, maximum: input.maximum, now, windowMs: input.windowMs ?? 60 * 60 * 1000 });
  if (!next.allowed) return false;
  if (!existing) await db.insert(actionRateLimits).values({ userId: input.userId, actionType: input.actionType, windowStartedAt: next.windowStartedAt, actionCount: next.actionCount });
  else await db.update(actionRateLimits).set({ windowStartedAt: next.windowStartedAt, actionCount: next.actionCount }).where(eq(actionRateLimits.id, existing.id));
  return true;
}

export async function getAdminMembersWithAccounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ userId: users.id, email: users.email, name: users.name, lastSignedIn: users.lastSignedIn, displayName: userProfiles.displayName, city: userProfiles.city, verificationStatus: userProfiles.verificationStatus, accountStatus: userProfiles.accountStatus }).from(users).leftJoin(userProfiles, eq(users.id, userProfiles.userId)).orderBy(desc(users.lastSignedIn)).limit(50);
}

export async function getAdminSafetyAlerts() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: safetySignals.id, reporterUserId: safetySignals.reporterUserId, subjectUserId: safetySignals.subjectUserId, listingId: safetySignals.listingId, note: safetySignals.note, status: safetySignals.status, createdAt: safetySignals.createdAt }).from(safetySignals).where(and(eq(safetySignals.signalType, "safety_alert"), ne(safetySignals.status, "resolved"))).orderBy(desc(safetySignals.createdAt)).limit(30);
}

export async function updateSafetyAlert(input: { adminUserId: number; alertId: number; status: "received" | "under_review" | "resolved"; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(safetySignals).set({ status: input.status }).where(and(eq(safetySignals.id, input.alertId), eq(safetySignals.signalType, "safety_alert")));
  await db.insert(moderationActions).values({ adminUserId: input.adminUserId, actionType: `safety_alert_${input.status}`, note: `Alert ${input.alertId}: ${input.note || "Status updated in Studio."}` });
}

export async function setAccountStatus(input: { adminUserId: number; userId: number; status: AccountStatus }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.userId, input.userId)).limit(1))[0];
  if (!profile) throw new Error("The member must complete a profile before account status can be changed.");
  await db.update(userProfiles).set({ accountStatus: input.status }).where(eq(userProfiles.userId, input.userId));
  await db.insert(moderationActions).values({ adminUserId: input.adminUserId, targetUserId: input.userId, actionType: `account_${input.status}`, note: "Account status updated in Studio." });
}
