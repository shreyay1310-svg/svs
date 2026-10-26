import { getDb } from "../queries/connection";
import { activityLogs } from "@db/schema";

/**
 * Log an activity/event to the database
 */
export async function logActivity(data: {
  userId: number;
  userName?: string;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: string;
  ipAddress?: string;
}) {
  try {
    const db = getDb();
    await db.insert(activityLogs).values({
      userId: data.userId,
      userName: data.userName,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details,
      ipAddress: data.ipAddress,
    });
  } catch (err) {
    console.error("[ActivityLog] Failed to log activity:", err);
  }
}
