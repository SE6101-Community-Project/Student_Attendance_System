import cron from "node-cron";
import qrSessionModel from "../models/qrSessionModel.js";


// Auto-close sessions whose endTime has passed
// Runs every minute
export const startSessionScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find all sessions that:
      // - are still active (isActive: true)
      // - are not yet closed (isClosed: false)
      // - whose endTime has passed
      const expiredSessions = await qrSessionModel.find({
        isActive: true,
        isClosed: false,
        endTime: { $lte: now },
      });

      if (expiredSessions.length === 0) 
        return;

      // Close all expired sessions in one bulk write
      const result = await qrSessionModel.updateMany(
        {
          isActive: true,
          isClosed: false,
          endTime: { $lte: now },
        },
        {
          $set: {
            isActive: false,
            isClosed: true,
          },
        },
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[SessionScheduler] Auto-closed ${result.modifiedCount} expired session(s) at ${now.toISOString()}`,
        );
      }
    } catch (err) {
      console.log("[SessionScheduler] Error:", err.message);
    }
  });

  console.log("[SessionScheduler] Started — checking every minute");
};