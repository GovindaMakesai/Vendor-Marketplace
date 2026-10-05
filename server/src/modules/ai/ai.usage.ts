import { prisma } from "../../lib/prisma";

export interface AiUsageStore {
  tryConsume(usageDate: string, limit: number): Promise<boolean>;
}

export function usageDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export class PrismaAiUsageStore implements AiUsageStore {
  async tryConsume(usageDateKey: string, limit: number): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const row = await tx.aiUsageDaily.upsert({
        where: { usageDate: usageDateKey },
        create: { usageDate: usageDateKey, requestCount: 1 },
        update: { requestCount: { increment: 1 } },
      });
      if (row.requestCount > limit) {
        await tx.aiUsageDaily.update({
          where: { usageDate: usageDateKey },
          data: { requestCount: { decrement: 1 } },
        });
        return false;
      }
      return true;
    });
  }
}
