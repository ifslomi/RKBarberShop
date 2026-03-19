// Firestore collection types for RK Barbershop

export const DAYS_OF_WEEK = [
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday",
] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  noPrice?: boolean;
  duration: number; // minutes
  active: boolean;
  order: number;
  createdAt: string;
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;       // derived display string (comma-joined service names)
  services?: string[];     // array of service IDs offered by this barber
  reservePrice: number;
  walkinPrice: number;
  active: boolean;
  image: string;
  order: number;
  availableDays: string[];
  availableFrom: string;
  availableTo: string;
  daysOff?: string[];     // specific ISO dates (yyyy-MM-dd) when barber is off
  createdAt: string;
}

export interface Booking {
  id: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  serviceIds?: string[];   // all selected service IDs
  serviceNames?: string[]; // all selected service names
  customerName: string;
  phone: string;
  email?: string;
  notes: string;
  date: string;
  time: string;
  type: "reservation" | "walkin";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  price: number;
  customerDecision?: "awaiting" | "accepted" | "cancelled" | "reschedule_requested" | "expired";
  customerActionRequired?: boolean;
  customerActionDeadline?: string;
  customerDecisionAt?: string;
  autoCancelledAt?: string;
  emailNotificationSent?: boolean;
  emailNotificationError?: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  barberId: string;
  customerName: string;
  phone: string;
  position: number;
  status: "waiting" | "in-progress" | "done";
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  city: string;
  province: string;
  country: string;
  openTime: string;
  closeTime: string;
  operatingDays: string;
  email: string;
  facebookUrl: string;
  tiktokUrl: string;
  googleMapsUrl: string;
  tagline: string;
  aboutText: string;
  // Booking / payment settings
  gcashNumber?: string;
  reservationPolicyText?: string;
}

export const COLLECTIONS = {
  BARBERS: "barbers",
  BOOKINGS: "bookings",
  QUEUE: "queue",
  SETTINGS: "settings",
  SERVICES: "services",
} as const;
