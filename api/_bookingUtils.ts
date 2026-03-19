import crypto from "node:crypto";
import nodemailer from "nodemailer";

export type CustomerDecision = "awaiting" | "accepted" | "cancelled" | "reschedule_requested" | "expired";

export type BookingRecord = {
  id: string;
  barberId: string;
  barberName: string;
  customerName: string;
  phone: string;
  email?: string;
  date: string;
  time?: string;
  type: "reservation" | "walkin";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  serviceName?: string;
  price?: number;
  customerDecision?: CustomerDecision;
  customerActionRequired?: boolean;
  customerTokenHash?: string;
};

export function getBaseUrl(req: any): string {
  const envBase = (process.env.PUBLIC_BASE_URL || "").trim();
  if (envBase) return envBase.replace(/\/$/, "");

  const proto = String(req.headers?.["x-forwarded-proto"] || "https");
  const host = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost:5000");
  return `${proto}://${host}`;
}

export function parseBookingDateTime(date: string, time?: string): Date | null {
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

export function getActionDeadlineIso(date: string, time?: string): string | null {
  const appt = parseBookingDateTime(date, time);
  if (!appt) return null;
  const deadline = new Date(appt.getTime() - 60 * 60 * 1000);
  return deadline.toISOString();
}

export function isInsideActionWindow(date: string, time?: string, now = new Date()): boolean {
  const appt = parseBookingDateTime(date, time);
  if (!appt) return false;
  const deadline = new Date(appt.getTime() - 60 * 60 * 1000);
  return now.getTime() < deadline.getTime();
}

export function createActionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashActionToken(token: string): string {
  const secret =
    process.env.BOOKING_TOKEN_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_PROJECT_ID ||
    "rk-booking-secret";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function actionLabel(action: "accept" | "cancel" | "reschedule"): string {
  if (action === "accept") return "Accept Booking";
  if (action === "cancel") return "Cancel Booking";
  return "Request Reschedule";
}

export function buildActionEmailHtml(params: {
  customerName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time?: string;
  price: number;
  links: { accept: string; cancel: string; reschedule: string };
}): string {
  const { customerName, serviceName, barberName, date, time, price, links } = params;
  const rows = [
    ["Service(s)", serviceName || "-"],
    ["Barber", barberName || "-"],
    ["Schedule", `${date}${time ? ` at ${time}` : ""}`],
    ["Total", `PHP ${price}`],
  ]
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#666">${k}</td><td style="padding:6px 0;text-align:right;font-weight:600">${v}</td></tr>`)
    .join("");

  const actionButton = (href: string, action: "accept" | "cancel" | "reschedule") => {
    const color = action === "accept" ? "#10b981" : action === "cancel" ? "#ef4444" : "#f59e0b";
    return `<a href="${href}" style="display:inline-block;margin:6px 8px 0 0;padding:10px 14px;border-radius:8px;background:${color};color:#fff;text-decoration:none;font-weight:600">${actionLabel(action)}</a>`;
  };

  return `
  <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px">
      <h2 style="margin:0 0 8px">RK Barbershop Booking Confirmation</h2>
      <p style="margin:0 0 14px;color:#475569">Hi ${customerName}, please confirm your booking action before 1 hour of your appointment.</p>
      <table style="width:100%;border-collapse:collapse;margin:10px 0 14px">${rows}</table>
      <div>
        ${actionButton(links.accept, "accept")}
        ${actionButton(links.cancel, "cancel")}
        ${actionButton(links.reschedule, "reschedule")}
      </div>
      <p style="margin:14px 0 0;color:#64748b;font-size:12px">If no action is taken before 1 hour of the appointment, the reservation is automatically cancelled.</p>
    </div>
  </div>`;
}

export async function sendBookingActionEmail(params: {
  to: string;
  subject: string;
  html: string;
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

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  return { sent: true };
}

export function decisionToStatus(decision: CustomerDecision): BookingRecord["status"] {
  if (decision === "accepted") return "confirmed";
  if (decision === "cancelled" || decision === "expired") return "cancelled";
  return "pending";
}

export function actionResultHtml(title: string, message: string, ok = true): string {
  const color = ok ? "#16a34a" : "#dc2626";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;background:#0b0f17;color:#e2e8f0;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px;">
  <div style="max-width:560px;width:100%;background:#111827;border:1px solid #1f2937;border-radius:14px;padding:22px;">
    <h1 style="margin:0 0 10px;font-size:22px;color:${color}">${title}</h1>
    <p style="margin:0;color:#cbd5e1;line-height:1.5">${message}</p>
  </div>
</body>
</html>`;
}