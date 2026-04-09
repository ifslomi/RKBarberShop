import { getFirebaseAdminServices } from "../../../server/vercel/firebaseAdmin.js";

type Claims = {
  admin?: boolean;
  role?: string;
  email?: string;
};

function parseEmailAllowlist(): Set<string> {
  const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const fallback = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return new Set([...allowlist, ...(fallback ? [fallback] : [])]);
}

function hasAdminRights(claims: Claims): boolean {
  if (claims.admin === true || claims.role === "admin") {
    return true;
  }

  const email = (claims.email || "").trim().toLowerCase();
  return email.length > 0 && parseEmailAllowlist().has(email);
}

async function requireAdmin(req: any): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const header = req.headers?.authorization || "";
  const [scheme, token] = String(header).split(" ");
  if (scheme !== "Bearer" || !token) {
    return { ok: false, status: 401, message: "Missing or invalid authorization header" };
  }

  try {
    const { adminAuth } = getFirebaseAdminServices();
    const decoded = await adminAuth.verifyIdToken(token, true);
    if (!hasAdminRights(decoded as Claims)) {
      return { ok: false, status: 403, message: "Admin role required" };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
}

export default async function handler(req: any, res: any) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    res.status(auth.status).json({ message: auth.message });
    return;
  }

  const id = String(req.query?.id || "").trim();
  if (!id) {
    res.status(400).json({ message: "Missing booking id" });
    return;
  }

  try {
    const { adminDb } = getFirebaseAdminServices();
    if (req.method === "PATCH") {
      const payload = req.body || {};
      const status = payload.status;
      const date = typeof payload.date === "string" ? payload.date.trim() : "";
      const time = typeof payload.time === "string" ? payload.time.trim() : "";

      const hasStatus = typeof status === "string" && status.length > 0;
      const hasReschedule = date.length > 0 || time.length > 0;
      if (!hasStatus && !hasReschedule) {
        res.status(400).json({ message: "No fields provided" });
        return;
      }

      if (hasStatus) {
        const allowed = new Set(["pending", "confirmed", "cancelled", "completed"]);
        if (!allowed.has(status)) {
          res.status(400).json({ message: "Invalid booking status" });
          return;
        }
      }

      if (status === "confirmed") {
        const bookingDoc = await adminDb.collection("bookings").doc(id).get();
        const booking = bookingDoc.exists ? (bookingDoc.data() as Record<string, unknown>) : null;
        const isReservation = String(booking?.type || "") === "reservation";
        const customerDecision = String(booking?.customerDecision || "awaiting");
        if (isReservation && customerDecision !== "accepted") {
          res.status(409).json({ message: "Customer must confirm via email action before admin confirmation" });
          return;
        }
      }

      const updates: Record<string, unknown> = {};
      if (hasStatus) updates.status = status;
      if (date.length > 0) updates.date = date;
      if (time.length > 0) updates.time = time;

      if (hasReschedule) {
        updates.status = "confirmed";
        updates.customerDecision = "accepted";
        updates.customerDecisionAt = new Date().toISOString();
        updates.customerActionRequired = false;
        updates.rescheduledAt = new Date().toISOString();
      }

      await adminDb.collection("bookings").doc(id).set(updates, { merge: true });
      res.status(200).json({ id, ...updates });
      return;
    }

    if (req.method === "DELETE") {
      await adminDb.collection("bookings").doc(id).delete();
      res.status(204).send("");
      return;
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("admin bookings mutation failed", error);
    const message = error instanceof Error ? error.message : "Booking operation failed";
    res.status(500).json({ message });
  }
}
