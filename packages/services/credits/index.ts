import { db } from "@repo/database";

export class CreditService {
  /**
   * Check if a user has at least `amount` tokens in their balance.
   */
  async hasEnoughTokens(userId: string, amount: number): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    });

    if (!user) return false;
    return user.tokenBalance >= amount;
  }

  /**
   * Deduct `amount` tokens from the user's balance.
   * Throws an error if they don't have enough.
   */
  async deductTokens(userId: string, amount: number): Promise<{ success: boolean; newBalance: number }> {
    // We use an atomic decrement. Prisma handles this safely.
    // However, to prevent going below 0, we can do a raw query or fetch first.
    // For simplicity, we'll fetch first, check, then atomic decrement with an optimistic lock or just rely on the DB.
    
    return await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { tokenBalance: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.tokenBalance < amount) {
        throw new Error(`Insufficient credits. Required: ${amount / 1000} credits, Available: ${(user.tokenBalance / 1000).toFixed(1)} credits`);
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          tokenBalance: {
            decrement: amount,
          },
        },
        select: { tokenBalance: true },
      });

      return { success: true, newBalance: updated.tokenBalance };
    });
  }

  /**
   * Gets the current user balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    });
    return user?.tokenBalance || 0;
  }
}

export const creditService = new CreditService();
