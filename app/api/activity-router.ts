import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { activityLogs } from "@db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const activityRouter = createRouter({
  list: adminQuery
    .input(
      z.object({
        search: z.string().optional(),
        userId: z.number().optional(),
        action: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 50;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (input?.userId) conditions.push(eq(activityLogs.userId, input.userId));
      if (input?.action) conditions.push(eq(activityLogs.action, input.action));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          userName: activityLogs.userName,
          action: activityLogs.action,
          entityType: activityLogs.entityType,
          entityId: activityLogs.entityId,
          details: activityLogs.details,
          ipAddress: activityLogs.ipAddress,
          createdAt: activityLogs.createdAt,
        })
        .from(activityLogs)
        .where(where)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(activityLogs)
        .where(where);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      };
    }),
});
