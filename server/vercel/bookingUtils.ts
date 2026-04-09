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
  return actionResultWithBackHtml({ title, message, ok });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function bookingActionPageHtml(params: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  baseUrl: string;
}): string {
  const subtitle = params.subtitle ? `<p class="subtitle">${escapeHtml(params.subtitle)}</p>` : "";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(params.title)}</title>
  <style>
    :root {
      --bg: #08090c;
      --card: rgba(18, 20, 26, 0.9);
      --text: #e6e8ef;
      --muted: #9aa3b2;
      --gold: #d8a615;
      --line: rgba(216, 166, 21, 0.25);
      --ok: #2fb86e;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, Segoe UI, Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(1200px 500px at 10% -20%, rgba(216,166,21,.20), transparent 60%),
        radial-gradient(900px 500px at 100% 0%, rgba(55,65,81,.24), transparent 60%),
        var(--bg);
      display: grid;
      place-items: center;
      padding: 20px;
    }
    .card {
      width: 100%;
      max-width: 760px;
      border-radius: 20px;
      border: 1px solid var(--line);
      background: var(--card);
      box-shadow: 0 24px 80px rgba(0,0,0,.45);
      overflow: hidden;
      backdrop-filter: blur(8px);
    }
    .topline {
      height: 4px;
      width: 100%;
      background: linear-gradient(90deg, var(--gold), rgba(216,166,21,.25));
    }
    .inner { padding: 24px; }
    .brand { font-size: 14px; letter-spacing: .08em; text-transform: uppercase; color: var(--gold); font-weight: 700; }
    h1 { margin: 8px 0 8px; font-size: 30px; line-height: 1.15; }
    .subtitle { margin: 0 0 18px; color: var(--muted); font-size: 14px; }
    .actions { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.18);
      color: var(--text);
      text-decoration: none;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      background: rgba(255,255,255,.05);
    }
    .btn-primary { background: var(--gold); border-color: var(--gold); color: #131313; }
    .panel {
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 14px;
      background: rgba(255,255,255,.03);
      padding: 16px;
    }
    .field { margin-bottom: 12px; }
    .field label { display: block; color: var(--muted); margin-bottom: 6px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .input {
      width: 100%;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 10px;
      background: rgba(8,9,12,.75);
      color: var(--text);
      padding: 10px 12px;
      font-size: 14px;
    }
    .muted { color: var(--muted); font-size: 13px; }
    .ok { color: var(--ok); }
    .danger { color: var(--danger); }
  </style>
</head>
<body>
  <div class="card">
    <div class="topline"></div>
    <div class="inner">
      <div class="brand">RK Barbershop</div>
      <h1>${escapeHtml(params.title)}</h1>
      ${subtitle}
      ${params.bodyHtml}
      <div class="actions">
        <a class="btn" href="${params.baseUrl}">Back to Homepage</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function actionResultWithBackHtml(params: {
  title: string;
  message: string;
  ok?: boolean;
  baseUrl?: string;
}): string {
  const ok = params.ok !== false;
  const bodyHtml = `<div class="panel"><p class="${ok ? "ok" : "danger"}" style="margin:0;font-weight:700">${escapeHtml(params.message)}</p></div>`;
  return bookingActionPageHtml({
    title: params.title,
    subtitle: "Booking action result",
    bodyHtml,
    baseUrl: params.baseUrl || "/",
  });
}

export function rescheduleFormHtml(params: {
  baseUrl: string;
  token: string;
  bookingId: string;
  currentDate: string;
  currentTime: string;
  minDate: string;
  maxDate: string;
  defaultTime24: string;
  availabilityText: string;
}): string {
  const bodyHtml = `
    <div class="panel" style="margin-bottom:12px">
      <p style="margin:0 0 8px;font-weight:700">Current schedule</p>
      <p class="muted" style="margin:0">${escapeHtml(params.currentDate)} ${escapeHtml(params.currentTime || "")}</p>
      <p class="muted" style="margin:10px 0 0">${escapeHtml(params.availabilityText)}</p>
    </div>

    <form method="POST" action="${params.baseUrl}/api/bookings/action">
      <input type="hidden" name="token" value="${escapeHtml(params.token)}" />
      <input type="hidden" name="action" value="reschedule" />
      <input type="hidden" name="bookingId" value="${escapeHtml(params.bookingId)}" />

      <div class="field">
        <label for="date">New Date</label>
        <input class="input" id="date" name="date" type="date" required min="${escapeHtml(params.minDate)}" max="${escapeHtml(params.maxDate)}" value="${escapeHtml(params.currentDate)}" />
      </div>
      <div class="field">
        <label for="time">New Time</label>
        <input class="input" id="time" name="time" type="time" required value="${escapeHtml(params.defaultTime24)}" />
      </div>

      <div class="actions" style="margin-top:6px">
        <button class="btn btn-primary" type="submit">Update Booking</button>
        <a class="btn" href="${params.baseUrl}">Cancel</a>
      </div>
    </form>
  `;

  return bookingActionPageHtml({
    title: "Reschedule Booking",
    subtitle: "Choose a new schedule based on barber availability",
    bodyHtml,
    baseUrl: params.baseUrl,
  });
}