import { getFirebaseAdminServices } from "../../server/vercel/firebaseAdmin.js";
import {
  buildActionEmailHtml,
  createActionToken,
  getActionDeadlineIso,
  getBaseUrl,
  hashActionToken,
  sendBookingActionEmail,
} from "../../server/vercel/bookingUtils.js";

type BookingType = "reservation" | "walkin";

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const payload = req.body || {};
    const type = String(payload.type || "") as BookingType;
    const barberId = String(payload.barberId || "").trim();
    const customerName = String(payload.customerName || "").trim();
    const phone = String(payload.phone || "").trim();
    const email = String(payload.email || "").trim();
    const date = String(payload.date || "").trim();
    const time = String(payload.time || "").trim();

    if (type !== "reservation" && type !== "walkin") {
      res.status(400).json({ message: "Invalid booking type" });
      return;
    }
    if (!barberId || !customerName || !phone || !date) {
      res.status(400).json({ message: "Missing required booking fields" });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ message: "Invalid phone number" });
      return;
    }
    if (type === "reservation" && (!email || !email.includes("@"))) {
      res.status(400).json({ message: "Reservation requires a valid email" });
      return;
    }

    const { adminDb } = getFirebaseAdminServices();
    const barberDoc = await adminDb.collection("barbers").doc(barberId).get();
    if (!barberDoc.exists) {
      res.status(400).json({ message: "Selected barber not found" });
      return;
    }
    const barber = barberDoc.data() as Record<string, unknown>;
    const barberName = String(barber.name || payload.barberName || "").trim();
    const price = type === "reservation" ? Number(barber.reservePrice || 0) : Number(barber.walkinPrice || 0);
    const paymentProofUrl = String(payload.paymentProofUrl || "").trim();

    if (type === "reservation" && price > 0 && !paymentProofUrl) {
      res.status(400).json({ message: "Reservation requires payment proof upload" });
      return;
    }

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
      paymentProofUrl,
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

      const html = buildActionEmailHtml({
        customerName,
        serviceName: bookingData.serviceName,
        barberName,
        date,
        time,
        price,
        links,
      });

      emailResult = await sendBookingActionEmail({
        to: email,
        subject: "RK Barbershop - Confirm Your Booking",
        html,
      });

      await bookingRef.set(
        {
          emailNotificationSent: emailResult.sent,
          emailNotificationError: emailResult.reason || "",
        },
        { merge: true },
      );
    }

    res.status(201).json({
      id: bookingRef.id,
      status: bookingData.status,
      price,
      emailSent: emailResult.sent,
      emailReason: emailResult.reason || "",
    });
  } catch (error) {
    console.error("booking create failed", error);
    const message = error instanceof Error ? error.message : "Booking create failed";
    res.status(500).json({ message });
  }
}