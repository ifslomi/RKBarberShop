import { getFirebaseAdminServices } from "../../server/vercel/firebaseAdmin.js";
import { isInsideActionWindow } from "../../server/vercel/bookingUtils.js";

function canRunCron(req: any): boolean {
  const ua = String(req.headers?.["user-agent"] || "").toLowerCase();
  if (ua.includes("vercel-cron")) return true;

  const expected = (process.env.CRON_SECRET || "").trim();
  if (!expected) return true;

  const providedHeader = String(req.headers?.["x-cron-secret"] || "").trim();
  const providedQuery = String(req.query?.secret || "").trim();
  return providedHeader === expected || providedQuery === expected;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }
  if (!canRunCron(req)) {
    res.status(401).json({ message: "Unauthorized cron call" });
    return;
  }

  try {
    const { adminDb } = getFirebaseAdminServices();
    const snap = await adminDb.collection("bookings").where("type", "==", "reservation").get();

    let checked = 0;
    let cancelled = 0;
    const nowIso = new Date().toISOString();
    const writes: Array<Promise<unknown>> = [];

    for (const doc of snap.docs) {
      const booking = doc.data() as Record<string, any>;
      checked += 1;

      const status = String(booking.status || "");
      const decision = String(booking.customerDecision || "awaiting");
      const requiresAction = booking.customerActionRequired !== false;
      if (!requiresAction || decision !== "awaiting") continue;
      if (status === "cancelled" || status === "completed") continue;

      const inWindow = isInsideActionWindow(String(booking.date || ""), String(booking.time || ""));
      if (inWindow) continue;

      cancelled += 1;
      writes.push(
        doc.ref.set(
          {
            status: "cancelled",
            customerDecision: "expired",
            customerDecisionAt: nowIso,
            customerActionRequired: false,
            customerTokenHash: "",
            autoCancelledAt: nowIso,
          },
          { merge: true },
        ),
      );
    }

    await Promise.all(writes);
    res.status(200).json({ checked, cancelled });
  } catch (error) {
    console.error("expire-bookings cron failed", error);
    const message = error instanceof Error ? error.message : "Cron failed";
    res.status(500).json({ message });
  }
}