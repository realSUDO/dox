import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getAuth, createClerkClient } from "@clerk/express";
import { db } from "@repo/database";

const clerkClient = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY 
});

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  
  let user = null;
  
  if (userId) {
    user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress || `${userId}@clerk.local`;
        const displayName = clerkUser.firstName 
          ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
          : null;

        const existingUser = await db.user.findUnique({ where: { email } });

        if (existingUser) {
          const oldId = existingUser.id;
          await db.$transaction(async (tx) => {
            // 1. Create new user with Clerk ID (temp email to avoid unique conflict)
            await tx.user.create({
              data: { id: userId, email: `__migrating_${userId}`, passwordHash: 'clerk-managed', displayName }
            });
            // 2. Reparent all FK references using Prisma ORM (handles column mapping)
            await tx.leafMember.updateMany({ where: { userId: oldId }, data: { userId } });
            await tx.chatSession.updateMany({ where: { userId: oldId }, data: { userId } });
            await tx.guardrailEvent.updateMany({ where: { userId: oldId }, data: { userId } });
            await tx.source.updateMany({ where: { uploadedBy: oldId }, data: { uploadedBy: userId } });
            await tx.leaf.updateMany({ where: { ownerId: oldId }, data: { ownerId: userId } });
            // 3. Delete old sessions + old user
            await tx.session.deleteMany({ where: { userId: oldId } });
            await tx.user.delete({ where: { id: oldId } });
            // 4. Fix email on new user
            await tx.user.update({ where: { id: userId }, data: { email } });
          });
          user = await db.user.findUnique({ where: { id: userId } });
          console.log(`[Auth] Migrated user ${oldId} -> ${userId} (${email})`);
        } else {
          user = await db.user.create({
            data: { id: userId, email, passwordHash: 'clerk-managed', displayName }
          });
          console.log(`[Auth] Created new user ${userId} (${email})`);
        }
      } catch (err) {
        console.error("[Auth] Failed to sync Clerk user to Postgres:", err);
      }
    }
  }

  return { db, user, session: auth, clerkUserId: userId, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
