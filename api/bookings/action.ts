import { getFirebaseAdminServices } from "../_firebaseAdmin.js";
import {
  actionResultHtml,
  decisionToStatus,
  hashActionToken,
  isInsideActionWindow,
  type CustomerDecision,
} from "../_bookingUtils.js";

type Action = "accept" | "cancel" | "reschedule";

function toDecision(action: Action): CustomerDecision {
  if (action === "accept") return "accepted";
  if (action === "cancel") return "cancelled";
  return "reschedule_requested";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const token = String(req.query?.token || "").trim();
  const action = String(req.query?.action || "").trim() as Action;
  if (!token || !["accept", "cancel", "reschedule"].includes(action)) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
      actionResultHtml("Invalid Link", "This booking action link is invalid or incomplete.", false),
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
        actionResultHtml("Link Not Found", "This action link has expired or is no longer valid.", false),
      );
      return;
    }

    const doc = snap.docs[0];
    const booking = doc.data() as Record<string, any>;

    if (booking.type !== "reservation") {
      res.status(400).setHeader("Content-Type", "text/html; charset=utf-8").send(
        actionResultHtml("Invalid Booking Type", "Customer actions are only available for reservations.", false),
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
        actionResultHtml("Action Closed", "This reservation is already within 1 hour of appointment time and was automatically cancelled.", false),
      );
      return;
    }

    if (["cancelled", "completed"].includes(String(booking.status || ""))) {
      res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
        actionResultHtml("Already Finalized", `This booking is already marked as ${booking.status}.`, false),
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

    const title =
      action === "accept"
        ? "Booking Accepted"
        : action === "cancel"
          ? "Booking Cancelled"
          : "Reschedule Requested";
    const message =
      action === "accept"
        ? "Your reservation is now confirmed. Thank you for confirming early."
        : action === "cancel"
          ? "Your reservation has been cancelled successfully."
          : "Your reschedule request was recorded. Please wait for admin follow-up.";

    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(actionResultHtml(title, message, true));
  } catch (error) {
    console.error("booking action failed", error);
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8").send(
      actionResultHtml("Action Failed", "We could not process your booking action. Please contact the shop.", false),
    );
  }
}