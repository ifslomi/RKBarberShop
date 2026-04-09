import { getFirebaseAdminServices } from "../../server/vercel/firebaseAdmin.js";
import {
  actionResultWithBackHtml,
  buildActionEmailHtml,
  createActionToken,
  decisionToStatus,
  getBaseUrl,
  hashActionToken,
  isInsideActionWindow,
  rescheduleFormHtml,
  sendBookingActionEmail,
  type CustomerDecision,
} from "../../server/vercel/bookingUtils.js";

type Action = "accept" | "cancel" | "reschedule";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toDecision(action: Action): CustomerDecision {
  if (action === "accept") return "accepted";
  if (action === "cancel") return "cancelled";
  return "reschedule_requested";
}

function to12Hour(time24: string): string {
  const [hStr, mStr] = String(time24 || "").split(":");
  let h = Number(hStr);
  const m = Number(mStr || "0");
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

function to24Hour(time12: string): string {
  const match = String(time12 || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00";
  let h = Number(match[1]);
  const m = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseMinutesFrom12h(value: string): number | null {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = Number(match[1]);
  const m = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function parseMinutesFrom24h(value: string): number | null {
  const match = String(value || "").trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseBodyValue(req: any, key: string): string {
  const body = req.body;
  if (body && typeof body === "object" && key in body) return String(body[key] || "").trim();
  if (typeof body === "string") {
    const params = new URLSearchParams(body);
    return String(params.get(key) || "").trim();
  }
  return "";
}

function validateRescheduleAgainstBarber(params: {
  date: string;
  time24: string;
  barber: Record<string, any>;
}): string | null {
  const { date, time24, barber } = params;
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "Invalid date value";

  const dayName = DAY_NAMES[parsedDate.getDay()];
  const availableDays = Array.isArray(barber.availableDays) ? barber.availableDays.map((d: any) => String(d)) : [];
  if (availableDays.length > 0 && !availableDays.includes(dayName)) {
    return `Barber is not available on ${dayName}`;
  }

  const daysOff = Array.isArray(barber.daysOff) ? barber.daysOff.map((d: any) => String(d)) : [];
  if (daysOff.includes(date)) {
    return "Barber is off on the selected date";
  }

  const selectedMinutes = parseMinutesFrom24h(time24);
  const openMinutes = parseMinutesFrom12h(String(barber.availableFrom || "9:00 AM"));
  const closeMinutes = parseMinutesFrom12h(String(barber.availableTo || "8:00 PM"));
  if (selectedMinutes === null || openMinutes === null || closeMinutes === null) {
    return "Invalid time value";
  }
  if (selectedMinutes < openMinutes || selectedMinutes >= closeMinutes) {
    return `Selected time is outside barber schedule (${barber.availableFrom || "9:00 AM"} - ${barber.availableTo || "8:00 PM"})`;
  }

  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const token = req.method === "GET"
    ? String(req.query?.token || "").trim()
    : parseBodyValue(req, "token");
  const action = (req.method === "GET"
    ? String(req.query?.action || "").trim()
    : parseBodyValue(req, "action")) as Action;
  const baseUrl = getBaseUrl(req);

  if (!token || !["accept", "cancel", "reschedule"].includes(action)) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
      actionResultWithBackHtml({
        title: "Invalid Link",
        message: "This booking action link is invalid or incomplete.",
        ok: false,
        baseUrl,
      }),
    );
    return;
  }

  try {
    const { adminDb } = getFirebaseAdminServices();
    const tokenHash = hashActionToken(token);
    const snap = await adminDb
      .collection("bookings")
      .where("customerTokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (snap.empty) {
      res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send(
        actionResultWithBackHtml({
          title: "Link Not Found",
          message: "This action link has expired or is no longer valid.",
          ok: false,
          baseUrl,
        }),
      );
      return;
    }

    const doc = snap.docs[0];
    const booking = doc.data() as Record<string, any>;

    if (booking.type !== "reservation") {
      res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
        actionResultWithBackHtml({
          title: "Invalid Booking Type",
          message: "Customer actions are only available for reservations.",
          ok: false,
          baseUrl,
        }),
      );
      return;
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

      res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
        actionResultWithBackHtml({
          title: "Action Closed",
          message: "This reservation is already within 1 hour of appointment time and was automatically cancelled.",
          ok: false,
          baseUrl,
        }),
      );
      return;
    }

    if (["cancelled", "completed"].includes(String(booking.status || ""))) {
      res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
        actionResultWithBackHtml({
          title: "Already Finalized",
          message: `This booking is already marked as ${booking.status}.`,
          ok: false,
          baseUrl,
        }),
      );
      return;
    }

    if (action === "reschedule" && req.method === "GET") {
      const barberDoc = await adminDb.collection("barbers").doc(String(booking.barberId || "")).get();
      const barber = barberDoc.exists ? (barberDoc.data() as Record<string, any>) : {};
      const today = new Date();
      const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const maxDateObj = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 60);
      const maxDate = `${maxDateObj.getFullYear()}-${String(maxDateObj.getMonth() + 1).padStart(2, "0")}-${String(maxDateObj.getDate()).padStart(2, "0")}`;

      res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
        rescheduleFormHtml({
          baseUrl,
          token,
          bookingId: doc.id,
          currentDate: String(booking.date || minDate),
          currentTime: String(booking.time || ""),
          minDate,
          maxDate,
          defaultTime24: to24Hour(String(booking.time || "9:00 AM")),
          availabilityText: `Available days: ${Array.isArray(barber.availableDays) && barber.availableDays.length > 0 ? barber.availableDays.join(", ") : "Monday-Sunday"}. Hours: ${String(barber.availableFrom || "9:00 AM")} - ${String(barber.availableTo || "8:00 PM")}`,
        }),
      );
      return;
    }

    if (action === "reschedule" && req.method === "POST") {
      const newDate = parseBodyValue(req, "date");
      const newTime24 = parseBodyValue(req, "time");
      if (!newDate || !newTime24) {
        res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
          actionResultWithBackHtml({ title: "Invalid Input", message: "Please provide both date and time.", ok: false, baseUrl }),
        );
        return;
      }

      const barberDoc = await adminDb.collection("barbers").doc(String(booking.barberId || "")).get();
      const barber = barberDoc.exists ? (barberDoc.data() as Record<string, any>) : {};
      const availabilityError = validateRescheduleAgainstBarber({ date: newDate, time24: newTime24, barber });
      if (availabilityError) {
        res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
          actionResultWithBackHtml({ title: "Schedule Not Available", message: availabilityError, ok: false, baseUrl }),
        );
        return;
      }

      const newTime12 = to12Hour(newTime24);
      const newToken = createActionToken();
      const newTokenHash = hashActionToken(newToken);

      await doc.ref.set(
        {
          date: newDate,
          time: newTime12,
          status: "confirmed",
          customerDecision: "accepted",
          customerDecisionAt: new Date().toISOString(),
          customerActionRequired: false,
          customerTokenHash: newTokenHash,
          rescheduledAt: new Date().toISOString(),
        },
        { merge: true },
      );

      const links = {
        accept: `${baseUrl}/api/bookings/action?action=accept&token=${encodeURIComponent(newToken)}`,
        cancel: `${baseUrl}/api/bookings/action?action=cancel&token=${encodeURIComponent(newToken)}`,
        reschedule: `${baseUrl}/api/bookings/action?action=reschedule&token=${encodeURIComponent(newToken)}`,
      };
      const html = buildActionEmailHtml({
        customerName: String(booking.customerName || "Customer"),
        serviceName: String(booking.serviceName || ""),
        barberName: String(booking.barberName || ""),
        date: newDate,
        time: newTime12,
        price: Number(booking.price || 0),
        links,
      });
      if (String(booking.email || "").includes("@")) {
        await sendBookingActionEmail({
          to: String(booking.email),
          subject: "RK Barbershop - Booking Rescheduled",
          html,
        });
      }

      res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
        actionResultWithBackHtml({
          title: "Booking Rescheduled",
          message: `Your booking is now set to ${newDate} at ${newTime12}. A new confirmation email was sent.`,
          ok: true,
          baseUrl,
        }),
      );
      return;
    }

    const decision = toDecision(action);
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

    const title = action === "accept" ? "Booking Accepted" : "Booking Cancelled";
    const message = action === "accept"
      ? "Your reservation is now confirmed. Thank you for confirming early."
      : "Your reservation has been cancelled successfully.";

    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
      actionResultWithBackHtml({ title, message, ok: true, baseUrl }),
    );
  } catch (error) {
    console.error("booking action failed", error);
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8").send(
      actionResultWithBackHtml({
        title: "Action Failed",
        message: "We could not process your booking action. Please contact the shop.",
        ok: false,
        baseUrl,
      }),
    );
  }
}