import type { Express, Response, Request, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, type User } from "@shared/schema";
import { adminAuth, adminDb } from "./firebaseAdmin";
import { z } from "zod";

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

const bookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
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

  app.patch("/api/admin/bookings/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const parsed = bookingStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid booking payload", issues: parsed.error.issues });
      }

      await adminDb.collection("bookings").doc(id).set(parsed.data, { merge: true });
      return res.status(200).json({ id, ...parsed.data });
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
