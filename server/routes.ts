import type { Express, Response, Request, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, type User } from "@shared/schema";
import { adminAuth, adminDb } from "./firebaseAdmin";
import { z } from "zod";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

type ApiError = {
  message: string;
};

type AdminClaims = {
  admin?: boolean;
  role?: string;
  email?: string;
};

type AdminRequest = Request & {
  adminUid?: string;
};

type CustomerDecision = "awaiting" | "accepted" | "cancelled" | "reschedule_requested" | "expired";

function isValidPHPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

function getBaseUrl(req: Request): string {
  const envBase = (process.env.PUBLIC_BASE_URL || "").trim();
  if (envBase) return envBase.replace(/\/$/, "");

  const proto = String(req.header("x-forwarded-proto") || "http");
  const host = String(req.header("x-forwarded-host") || req.header("host") || "localhost:5000");
  return `${proto}://${host}`;
}

function parseBookingDateTime(date: string, time?: string): Date | null {
  const safeDate = String(date || "").trim();
  if (!safeDate) return null;

  if (!time) {
    const d = new Date(`${safeDate}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) {
    const d = new Date(`${safeDate}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const period = m[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const d = new Date(`${safeDate}T${hh}:${mm}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isInsideActionWindow(date: string, time?: string, now = new Date()): boolean {
  const appt = parseBookingDateTime(date, time);
  if (!appt) return false;
  const deadline = new Date(appt.getTime() - 60 * 60 * 1000);
  return now.getTime() < deadline.getTime();
}

function getActionDeadlineIso(date: string, time?: string): string | null {
  const appt = parseBookingDateTime(date, time);
  if (!appt) return null;
  return new Date(appt.getTime() - 60 * 60 * 1000).toISOString();
}

function createActionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashActionToken(token: string): string {
  const secret =
    process.env.BOOKING_TOKEN_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_PROJECT_ID ||
    "rk-booking-secret";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function decisionToStatus(decision: CustomerDecision): "pending" | "confirmed" | "cancelled" {
  if (decision === "accepted") return "confirmed";
  if (decision === "cancelled" || decision === "expired") return "cancelled";
  return "pending";
}

function actionResultHtml(title: string, message: string, ok = true): string {
  const color = ok ? "#16a34a" : "#dc2626";
  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title></head>
<body style="margin:0;background:#0b0f17;color:#e2e8f0;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px;">
  <div style="max-width:560px;width:100%;background:#111827;border:1px solid #1f2937;border-radius:14px;padding:22px;">
    <h1 style="margin:0 0 10px;font-size:22px;color:${color}">${title}</h1>
    <p style="margin:0;color:#cbd5e1;line-height:1.5">${message}</p>
  </div>
</body></html>`;
}

async function sendBookingActionEmail(params: {
  to: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time?: string;
  price: number;
  links: { accept: string; cancel: string; reschedule: string };
}): Promise<{ sent: boolean; reason?: string }> {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const from = (process.env.BOOKING_FROM_EMAIL || user || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !user || !pass || !from) {
    return { sent: false, reason: "SMTP environment variables are not configured" };
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px">
        <h2 style="margin:0 0 8px">RK Barbershop Booking Confirmation</h2>
        <p style="margin:0 0 14px;color:#475569">Hi ${params.customerName}, please confirm your booking action before 1 hour of your appointment.</p>
        <table style="width:100%;border-collapse:collapse;margin:10px 0 14px">
          <tr><td style="padding:6px 0;color:#666">Service(s)</td><td style="padding:6px 0;text-align:right;font-weight:600">${params.serviceName || "-"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Barber</td><td style="padding:6px 0;text-align:right;font-weight:600">${params.barberName || "-"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Schedule</td><td style="padding:6px 0;text-align:right;font-weight:600">${params.date}${params.time ? ` at ${params.time}` : ""}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Total</td><td style="padding:6px 0;text-align:right;font-weight:600">PHP ${params.price}</td></tr>
        </table>
        <a href="${params.links.accept}" style="display:inline-block;margin:6px 8px 0 0;padding:10px 14px;border-radius:8px;background:#10b981;color:#fff;text-decoration:none;font-weight:600">Accept Booking</a>
        <a href="${params.links.cancel}" style="display:inline-block;margin:6px 8px 0 0;padding:10px 14px;border-radius:8px;background:#ef4444;color:#fff;text-decoration:none;font-weight:600">Cancel Booking</a>
        <a href="${params.links.reschedule}" style="display:inline-block;margin:6px 8px 0 0;padding:10px 14px;border-radius:8px;background:#f59e0b;color:#fff;text-decoration:none;font-weight:600">Request Reschedule</a>
        <p style="margin:14px 0 0;color:#64748b;font-size:12px">If no action is taken before 1 hour of the appointment, the reservation is automatically cancelled.</p>
      </div>
    </div>`;

  await transporter.sendMail({
    from,
    to: params.to,
    subject: "RK Barbershop - Confirm Your Booking",
    html,
  });

  return { sent: true };
}

const bookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

const bookingPatchSchema = z
  .object({
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
    date: z.string().optional(),
    time: z.string().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one booking field must be provided",
  });

const bookingsQuerySchema = z.object({
  date: z.string().optional(),
});

const queuePatchSchema = z
  .object({
    status: z.enum(["waiting", "in-progress", "done"]).optional(),
    position: z.number().int().positive().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one queue field must be provided",
  });

const serviceCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number(),
  duration: z.number().int().positive(),
  active: z.boolean(),
  order: z.number(),
  createdAt: z.string(),
});

const servicePatchSchema = serviceCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one service field must be provided",
});

const barberCreateSchema = z.object({
  name: z.string().min(1),
  specialty: z.string(),
  services: z.array(z.string()).optional(),
  reservePrice: z.number(),
  walkinPrice: z.number(),
  active: z.boolean(),
  image: z.string(),
  order: z.number(),
  availableDays: z.array(z.string()),
  availableFrom: z.string(),
  availableTo: z.string(),
  daysOff: z.array(z.string()).optional(),
  createdAt: z.string(),
});

const barberPatchSchema = barberCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one barber field must be provided",
});

const settingsPatchSchema = z
  .object({
    shopName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
    operatingDays: z.string().optional(),
    email: z.string().optional(),
    facebookUrl: z.string().optional(),
    tiktokUrl: z.string().optional(),
    googleMapsUrl: z.string().optional(),
    tagline: z.string().optional(),
    aboutText: z.string().optional(),
    gcashNumber: z.string().optional(),
    reservationPolicyText: z.string().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one settings field must be provided",
  });

function parseEmailAllowlist(): Set<string> {
  const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const fallback = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return new Set([...allowlist, ...(fallback ? [fallback] : [])]);
}

function hasAdminRights(claims: AdminClaims): boolean {
  if (claims.admin === true || claims.role === "admin") {
    return true;
  }

  const allowlist = parseEmailAllowlist();
  if (allowlist.size === 0) {
    return false;
  }

  const email = (claims.email || "").trim().toLowerCase();
  return email.length > 0 && allowlist.has(email);
}

async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Missing or invalid authorization header" } satisfies ApiError);
    }

    const decoded = await adminAuth.verifyIdToken(token, true);
    if (!hasAdminRights(decoded as AdminClaims)) {
      return res.status(403).json({ message: "Admin role required" } satisfies ApiError);
    }

    req.adminUid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" } satisfies ApiError);
  }
}

function sendBadRequest(res: Response, message: string) {
  return res.status(400).json({ message } satisfies ApiError);
}

function sendNotFound(res: Response, message: string) {
  return res.status(404).json({ message } satisfies ApiError);
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    return res.status(200).json({
      status: "ok",
      service: "rkbarbershop-api",
      environment: process.env.NODE_ENV ?? "development",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/users/:id", async (req, res, next) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return sendNotFound(res, "User not found");
      }

      return res.status(200).json(sanitizeUser(user));
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/users", async (req, res, next) => {
    try {
      const username = String(req.query.username ?? "").trim();
      if (!username) {
        return sendBadRequest(res, "Query parameter 'username' is required");
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return sendNotFound(res, "User not found");
      }

      return res.status(200).json(sanitizeUser(user));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/users", async (req, res, next) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid request payload",
          issues: parsed.error.issues,
        });
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(parsed.data);
      return res.status(201).json(sanitizeUser(user));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/bookings", async (req, res, next) => {
    try {
      const payload = req.body || {};
      const type = String(payload.type || "").trim() as "reservation" | "walkin";
      const barberId = String(payload.barberId || "").trim();
      const customerName = String(payload.customerName || "").trim();
      const phone = String(payload.phone || "").trim();
      const email = String(payload.email || "").trim();
      const date = String(payload.date || "").trim();
      const time = String(payload.time || "").trim();

      if (type !== "reservation" && type !== "walkin") {
        return sendBadRequest(res, "Invalid booking type");
      }
      if (!barberId || !customerName || !phone || !date) {
        return sendBadRequest(res, "Missing required booking fields");
      }
      if (!isValidPHPhone(phone)) {
        return sendBadRequest(res, "Invalid phone number");
      }
      if (type === "reservation" && (!email || !email.includes("@"))) {
        return sendBadRequest(res, "Reservation requires a valid email");
      }

      const barberDoc = await adminDb.collection("barbers").doc(barberId).get();
      if (!barberDoc.exists) {
        return sendBadRequest(res, "Selected barber not found");
      }

      const barber = barberDoc.data() as Record<string, unknown>;
      const barberName = String(barber.name || payload.barberName || "").trim();
      const price = type === "reservation" ? Number(barber.reservePrice || 0) : Number(barber.walkinPrice || 0);

      const token = createActionToken();
      const tokenHash = hashActionToken(token);
      const actionDeadlineIso = type === "reservation" ? getActionDeadlineIso(date, time) : null;

      const bookingData = {
        barberId,
        barberName,
        serviceId: String(payload.serviceId || ""),
        serviceName: String(payload.serviceName || ""),
        serviceIds: Array.isArray(payload.serviceIds) ? payload.serviceIds : [],
        serviceNames: Array.isArray(payload.serviceNames) ? payload.serviceNames : [],
        customerName,
        phone,
        email,
        notes: String(payload.notes || ""),
        date,
        time: type === "reservation" ? time : "",
        type,
        status: type === "reservation" ? "pending" : "confirmed",
        price,
        createdAt: new Date().toISOString(),
        customerDecision: type === "reservation" ? "awaiting" : "accepted",
        customerActionRequired: type === "reservation",
        customerActionDeadline: actionDeadlineIso,
        customerDecisionAt: type === "reservation" ? "" : new Date().toISOString(),
        customerTokenHash: type === "reservation" ? tokenHash : "",
        emailNotificationSent: false,
        emailNotificationError: "",
      };

      const bookingRef = await adminDb.collection("bookings").add(bookingData);

      let emailResult: { sent: boolean; reason?: string } = { sent: false, reason: "Walk-in does not require email" };
      if (type === "reservation") {
        const baseUrl = getBaseUrl(req);
        const links = {
          accept: `${baseUrl}/api/bookings/action?action=accept&token=${encodeURIComponent(token)}`,
          cancel: `${baseUrl}/api/bookings/action?action=cancel&token=${encodeURIComponent(token)}`,
          reschedule: `${baseUrl}/api/bookings/action?action=reschedule&token=${encodeURIComponent(token)}`,
        };

        emailResult = await sendBookingActionEmail({
          to: email,
          customerName,
          serviceName: bookingData.serviceName,
          barberName,
          date,
          time,
          price,
          links,
        });

        await bookingRef.set(
          { emailNotificationSent: emailResult.sent, emailNotificationError: emailResult.reason || "" },
          { merge: true },
        );
      }

      return res.status(201).json({
        id: bookingRef.id,
        status: bookingData.status,
        price,
        emailSent: emailResult.sent,
        emailReason: emailResult.reason || "",
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/bookings/action", async (req, res, next) => {
    try {
      const token = String(req.query.token || "").trim();
      const action = String(req.query.action || "").trim() as "accept" | "cancel" | "reschedule";

      if (!token || !["accept", "cancel", "reschedule"].includes(action)) {
        return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
          actionResultHtml("Invalid Link", "This booking action link is invalid or incomplete.", false),
        );
      }

      const tokenHash = hashActionToken(token);
      const snap = await adminDb.collection("bookings").where("customerTokenHash", "==", tokenHash).limit(1).get();
      if (snap.empty) {
        return res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send(
          actionResultHtml("Link Not Found", "This action link has expired or is no longer valid.", false),
        );
      }

      const doc = snap.docs[0];
      const booking = doc.data() as Record<string, any>;
      if (booking.type !== "reservation") {
        return res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
          actionResultHtml("Invalid Booking Type", "Customer actions are only available for reservations.", false),
        );
      }

      if (!isInsideActionWindow(String(booking.date || ""), String(booking.time || ""))) {
        await doc.ref.set(
          {
            status: "cancelled",
            customerDecision: "expired",
            customerDecisionAt: new Date().toISOString(),
            customerActionRequired: false,
            customerTokenHash: "",
            autoCancelledAt: new Date().toISOString(),
          },
          { merge: true },
        );
        return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
          actionResultHtml("Action Closed", "This reservation is already within 1 hour of appointment time and was automatically cancelled.", false),
        );
      }

      if (["cancelled", "completed"].includes(String(booking.status || ""))) {
        return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
          actionResultHtml("Already Finalized", `This booking is already marked as ${booking.status}.`, false),
        );
      }

      const decision: CustomerDecision = action === "accept" ? "accepted" : action === "cancel" ? "cancelled" : "reschedule_requested";
      const nextStatus = decisionToStatus(decision);
      await doc.ref.set(
        {
          status: nextStatus,
          customerDecision: decision,
          customerDecisionAt: new Date().toISOString(),
          customerActionRequired: false,
          customerTokenHash: "",
        },
        { merge: true },
      );

      const title = action === "accept" ? "Booking Accepted" : action === "cancel" ? "Booking Cancelled" : "Reschedule Requested";
      const message =
        action === "accept"
          ? "Your reservation is now confirmed. Thank you for confirming early."
          : action === "cancel"
            ? "Your reservation has been cancelled successfully."
            : "Your reschedule request was recorded. Please wait for admin follow-up.";
      return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(actionResultHtml(title, message, true));
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/cron/expire-bookings", async (req, res, next) => {
    try {
      const expected = (process.env.CRON_SECRET || "").trim();
      const isVercelCron = String(req.header("user-agent") || "").toLowerCase().includes("vercel-cron");
      if (expected && !isVercelCron) {
        const providedHeader = String(req.header("x-cron-secret") || "").trim();
        const providedQuery = String(req.query.secret || "").trim();
        if (providedHeader !== expected && providedQuery !== expected) {
          return res.status(401).json({ message: "Unauthorized cron call" });
        }
      }

      const snap = await adminDb.collection("bookings").where("type", "==", "reservation").get();
      let checked = 0;
      let cancelled = 0;
      const nowIso = new Date().toISOString();
      const writes: Array<Promise<FirebaseFirestore.WriteResult>> = [];

      for (const doc of snap.docs) {
        const booking = doc.data() as Record<string, any>;
        checked += 1;
        const status = String(booking.status || "");
        const decision = String(booking.customerDecision || "awaiting");
        const requiresAction = booking.customerActionRequired !== false;
        if (!requiresAction || decision !== "awaiting") continue;
        if (status === "cancelled" || status === "completed") continue;
        if (isInsideActionWindow(String(booking.date || ""), String(booking.time || ""))) continue;

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
      return res.status(200).json({ checked, cancelled });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/bookings/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const parsed = bookingPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid booking payload", issues: parsed.error.issues });
      }

      if (parsed.data.status === "confirmed") {
        const bookingDoc = await adminDb.collection("bookings").doc(id).get();
        const booking = bookingDoc.exists ? (bookingDoc.data() as Record<string, unknown>) : null;
        const isReservation = String(booking?.type || "") === "reservation";
        const customerDecision = String(booking?.customerDecision || "awaiting");
        if (isReservation && customerDecision !== "accepted") {
          return res.status(409).json({
            message: "Customer must confirm via email action before admin confirmation",
          });
        }
      }

      const updates: Record<string, unknown> = { ...parsed.data };
      if (parsed.data.date || parsed.data.time) {
        updates.status = "confirmed";
        updates.customerDecision = "accepted";
        updates.customerDecisionAt = new Date().toISOString();
        updates.customerActionRequired = false;
        updates.rescheduledAt = new Date().toISOString();
      }

      await adminDb.collection("bookings").doc(id).set(updates, { merge: true });
      return res.status(200).json({ id, ...updates });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/bookings", requireAdmin, async (req, res, next) => {
    try {
      const parsedQuery = bookingsQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({ message: "Invalid bookings query", issues: parsedQuery.error.issues });
      }

      const snapshot = await adminDb.collection("bookings").orderBy("createdAt", "desc").get();
      const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) as Array<
        { id: string; date?: unknown } & Record<string, unknown>
      >;
      const dateFilter = (parsedQuery.data.date || "").trim();
      const filtered = dateFilter ? bookings.filter((booking) => booking.date === dateFilter) : bookings;

      return res.status(200).json(filtered);
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/admin/bookings/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      await adminDb.collection("bookings").doc(id).delete();
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/queue/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const parsed = queuePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid queue payload", issues: parsed.error.issues });
      }

      await adminDb.collection("queue").doc(id).set(parsed.data, { merge: true });
      return res.status(200).json({ id, ...parsed.data });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/admin/queue/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      await adminDb.collection("queue").doc(id).delete();
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/services", requireAdmin, async (req, res, next) => {
    try {
      const parsed = serviceCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid service payload", issues: parsed.error.issues });
      }

      const created = await adminDb.collection("services").add(parsed.data);
      return res.status(201).json({ id: created.id, ...parsed.data });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/services/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const parsed = servicePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid service payload", issues: parsed.error.issues });
      }

      await adminDb.collection("services").doc(id).set(parsed.data, { merge: true });
      return res.status(200).json({ id, ...parsed.data });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/admin/services/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      await adminDb.collection("services").doc(id).delete();
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/barbers", requireAdmin, async (req, res, next) => {
    try {
      const parsed = barberCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid barber payload", issues: parsed.error.issues });
      }

      const created = await adminDb.collection("barbers").add(parsed.data);
      return res.status(201).json({ id: created.id, ...parsed.data });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/barbers/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const parsed = barberPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid barber payload", issues: parsed.error.issues });
      }

      await adminDb.collection("barbers").doc(id).set(parsed.data, { merge: true });
      return res.status(200).json({ id, ...parsed.data });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/admin/barbers/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      await adminDb.collection("barbers").doc(id).delete();
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/settings", requireAdmin, async (req, res, next) => {
    try {
      const parsed = settingsPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid settings payload", issues: parsed.error.issues });
      }

      await adminDb.collection("settings").doc("shop").set(parsed.data, { merge: true });
      return res.status(200).json(parsed.data);
    } catch (error) {
      return next(error);
    }
  });

  app.use("/api/{*path}", (_req, res) => {
    return sendNotFound(res, "API route not found");
  });

  return httpServer;
}
