import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Barber, Service } from "@/lib/types";
import { createBooking, addToQueue, getQueue } from "@/lib/firestore";
import { useBarbers, useServices, useQueue, useSettings } from "@/hooks/useFirestore";
import { format } from "date-fns";
import {
  CalendarIcon, Clock, Scissors, Loader2,
  CheckCircle2, ChevronRight, Users, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function generateTimeslots(from: string, to: string): string[] {
  const slots: string[] = [];
  const parseTime = (t: string) => {
    const [time, period] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  };
  const start = parseTime(from || "9:00 AM");
  const end = parseTime(to || "8:00 PM");
  for (let t = start; t < end; t += 30) slots.push(formatTime(t));
  return slots;
}

function isValidPHPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

/** Returns true if the barber's schedule covers today's day AND current time is within their hours. */
function isBarberAvailableNow(barber: Barber): boolean {
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const workDays = barber.availableDays;
  if (workDays && workDays.length > 0 && !workDays.includes(todayName)) return false;

  // Check admin-set specific days off
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (barber.daysOff && barber.daysOff.includes(todayISO)) return false;

  // Parse time helper (returns minutes since midnight)
  const parseTime = (t: string) => {
    if (!t) return null;
    const [time, period] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + (m || 0);
  };

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = parseTime(barber.availableFrom || "9:00 AM");
  const closeMins = parseTime(barber.availableTo || "8:00 PM");
  if (openMins !== null && nowMins < openMins) return false;
  if (closeMins !== null && nowMins >= closeMins) return false;

  return true;
}

const TOTAL_STEPS = 7;
const STEP_LABELS = ["Service Type", "Choose Barber", "Services", "Schedule", "Booking Policy", "Your Details", "Confirm"];

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBarber?: Barber | null;
}

export function BookingModal({ open, onOpenChange, initialBarber }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<"reservation" | "walkin">("reservation");
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(initialBarber ?? null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>();
  const [notes, setNotes] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { barbers } = useBarbers();
  const { services } = useServices();
  const { queue } = useQueue();
  const { settings } = useSettings();
  const { toast } = useToast();

  const gcashNumber = settings?.gcashNumber || "09263746324";

  const activeBarbers = barbers.filter((b) => b.active);
  const activeServices = services.filter((s) => s.active);
  const totalPrice = selectedBarber
    ? (type === "reservation" ? selectedBarber.reservePrice : selectedBarber.walkinPrice)
    : 0;
  const hasPayablePrice = totalPrice > 0;
  const priceLabel = type === "reservation" ? "Reservation Price" : "Walk-in Price";

  const resetForm = () => {
    setStep(1);
    setType("reservation");
    setSelectedBarber(initialBarber ?? null);
    setSelectedServices([]);
    setDate(undefined);
    setTime(undefined);
    setNotes("");
    setPolicyAccepted(false);
    setName("");
    setPhone("");
    setEmail("");
    setPhoneError("");
  };

  useEffect(() => {
    if (!open) return;
    setSelectedBarber(initialBarber ?? null);
  }, [open, initialBarber]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 400);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return true;
      case 2: return !!selectedBarber && (type !== "walkin" || isBarberAvailableNow(selectedBarber));
      case 3: return selectedServices.length > 0;
      case 4: return type === "walkin" || (!!date && !!time);
      case 5: return policyAccepted;
      case 6: {
        if (!name.trim()) return false;
        if (!isValidPHPhone(phone)) return false;
        if (type === "reservation" && !email.includes("@")) return false;
        return true;
      }
      default: return true;
    }
  };

  const handleConfirm = async () => {
    if (!selectedBarber || selectedServices.length === 0) return;
    setSubmitting(true);
    try {
      const bookingDate =
        type === "reservation" && date
          ? format(date, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd");

      await createBooking({
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        serviceId: selectedServices[0]?.id || "",
        serviceName: selectedServices.map((s) => s.name).join(", "),
        serviceIds: selectedServices.map((s) => s.id),
        serviceNames: selectedServices.map((s) => s.name),
        customerName: name,
        phone,
        email,
        notes,
        date: bookingDate,
        time: type === "reservation" && time ? time : "",
        type,
        status: type === "reservation" ? "pending" : "confirmed",
        price: totalPrice,
        createdAt: new Date().toISOString(),
      } as any);

      if (type === "walkin") {
        const currentQueue = await getQueue();
        const barberQ = currentQueue.filter(
          (q) => q.barberId === selectedBarber.id && q.status !== "done"
        );
        await addToQueue({
          barberId: selectedBarber.id,
          customerName: name,
          phone,
          position: barberQ.length + 1,
          status: "waiting",
          createdAt: new Date().toISOString(),
        });
      }

      toast({
        title: "Booking Submitted!",
        description:
          type === "reservation"
            ? hasPayablePrice
              ? `Waiting for admin confirmation. Send ₱${totalPrice} via GCash ${gcashNumber} to proceed.`
              : "Waiting for admin confirmation."
            : `You've been added to ${selectedBarber.name}'s queue.`,
      });
      handleClose();
    } catch {
      toast({ title: "Booking Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const barberQueueCount = selectedBarber
    ? queue.filter((q) => q.barberId === selectedBarber.id && q.status !== "done").length
    : 0;

  const timeslots = generateTimeslots(
    selectedBarber?.availableFrom || "9:00 AM",
    selectedBarber?.availableTo || "8:00 PM"
  );

  const toggleService = (service: Service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  };

  const shouldSkipBarberStep =
    !!initialBarber &&
    !!selectedBarber &&
    selectedBarber.id === initialBarber.id &&
    (type !== "walkin" || isBarberAvailableNow(selectedBarber));

  const goNextStep = () => {
    setStep((current) => {
      if (current === 1 && shouldSkipBarberStep) return 3;
      return current + 1;
    });
  };

  const goPreviousStep = () => {
    setStep((current) => {
      if (current === 3 && shouldSkipBarberStep) return 1;
      return current - 1;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border/50 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
          <DialogTitle className="text-xl flex items-center gap-2 font-heading">
            <Scissors className="w-5 h-5 text-primary" />
            Book Appointment
          </DialogTitle>
          <div className="space-y-1.5 mt-3">
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-500",
                    step > i + 1 ? "bg-primary" : step === i + 1 ? "bg-primary/60" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Step {step} / {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
            </p>
          </div>
        </DialogHeader>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── Step 1: Type ── */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">How would you like to visit?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["reservation", "walkin"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02]",
                          type === t
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border/50 bg-muted/20 hover:border-primary/40"
                        )}
                      >
                        {t === "reservation"
                          ? <Clock className={cn("w-7 h-7", type === t ? "text-primary" : "text-muted-foreground")} />
                          : <Users className={cn("w-7 h-7", type === t ? "text-primary" : "text-muted-foreground")} />
                        }
                        <div className="text-center">
                          <p className="font-semibold text-sm">
                            {t === "reservation" ? "Reservation" : "Walk-in"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t === "reservation" ? "Pick date & time" : "Join live queue"}
                          </p>
                        </div>
                        {type === t && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2: Barber ── */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {type === "walkin" ? "Choose your barber — only available barbers are selectable" : "Choose your barber"}
                  </p>
                  {selectedBarber && (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground">Selected {priceLabel}</span>
                      <span className="font-bold text-primary">₱{totalPrice}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {activeBarbers.map((barber) => {
                      const availableNow = type !== "walkin" || isBarberAvailableNow(barber);
                      const isSelected = selectedBarber?.id === barber.id;
                      const barberPrice = type === "reservation" ? barber.reservePrice : barber.walkinPrice;
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          disabled={!availableNow}
                          onClick={() => {
                            if (!availableNow) return;
                            setSelectedBarber(barber);
                            setDate(undefined);
                            setTime(undefined);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 relative",
                            !availableNow
                              ? "border-border/20 bg-muted/10 opacity-45 cursor-not-allowed"
                              : isSelected
                                ? "border-primary bg-primary/10 shadow-md hover:scale-[1.02]"
                                : "border-border/50 bg-muted/20 hover:border-primary/40 hover:scale-[1.02]"
                          )}
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                            {barber.image
                              ? <img src={barber.image} alt={barber.name} className="w-full h-full object-cover" />
                              : <span className="text-lg font-bold text-primary">{barber.name.charAt(0)}</span>
                            }
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-sm">{barber.name}</p>
                            {barber.specialty && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{barber.specialty}</p>
                            )}
                            <p className="text-xs mt-1 font-semibold text-primary">{priceLabel}: ₱{barberPrice}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {(barber.availableDays || DAY_NAMES.slice(1)).map((d) => d.slice(0, 2)).join(" · ")}
                            </p>
                            {!availableNow && (
                              <p className="text-xs text-red-400/80 mt-1 font-medium">Not available today</p>
                            )}
                          </div>
                          {isSelected && availableNow && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 3: Services (multi-select) ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select one or more services</p>
                  <div className="space-y-2">
                    {activeServices.map((service) => {
                      const isSelected = selectedServices.some((s) => s.id === service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service)}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.01]",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/50 bg-muted/20 hover:border-primary/40"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{service.name}</p>
                            {service.description && (
                              <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""}
                      </span>
                      {hasPayablePrice && <span className="font-bold text-primary">₱{totalPrice}</span>}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Notes (Optional)</Label>
                      <span className={cn("text-xs tabular-nums", notes.length >= 260 ? "text-amber-500" : "text-muted-foreground")}>
                        {notes.length}/280
                      </span>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 280))}
                      placeholder="Specific style, preferences, or requests..."
                      rows={2}
                      maxLength={280}
                      className="w-full rounded-xl border border-border/50 bg-input/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* ── Step 4: Schedule ── */}
              {step === 4 && (
                <div>
                  {type === "walkin" ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">Joining Today's Queue</h4>
                        <p className="text-muted-foreground text-sm mt-1 max-w-[260px] mx-auto">
                          You'll be added to <strong>{selectedBarber?.name}</strong>'s queue right after confirming.
                        </p>
                      </div>
                      <div className="bg-muted/30 border border-border/50 rounded-2xl px-8 py-4">
                        <p className="text-3xl font-bold">{barberQueueCount}</p>
                        <p className="text-xs text-muted-foreground">currently in queue</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Pick your date and time</p>
                      <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-input/50 text-sm text-left hover:border-primary/50 transition-colors",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="w-4 h-4 shrink-0" />
                              {date ? format(date, "MMMM d, yyyy") : "Pick a date"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 border-border/50" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={(d) => { setDate(d); setTime(undefined); }}
                              initialFocus
                              className="bg-card"
                              disabled={(d) => {
                                if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                                const dayName = DAY_NAMES[d.getDay()];
                                const workDays = selectedBarber?.availableDays;
                                if (workDays && workDays.length > 0 && !workDays.includes(dayName)) return true;
                                const dateStr = format(d, "yyyy-MM-dd");
                                if (selectedBarber?.daysOff?.includes(dateStr)) return true;
                                return false;
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Time Slot</Label>
                        <Select value={time} onValueChange={setTime} disabled={!date}>
                          <SelectTrigger className="w-full bg-input/50 border-border/50 h-11">
                            <SelectValue placeholder={date ? "Select a time" : "Pick a date first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {timeslots.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedBarber && (
                          <p className="text-xs text-muted-foreground">
                            Available {selectedBarber.availableFrom || "9:00 AM"} – {selectedBarber.availableTo || "8:00 PM"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 5: Booking Policy ── */}
              {step === 5 && (
                <div className="space-y-4">
                  {type === "reservation" ? (
                    <>
                      <p className="text-sm font-semibold">Our Booking Policy</p>
                      <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-2.5 text-sm leading-relaxed max-h-56 overflow-y-auto">
                        {settings?.reservationPolicyText ? (
                          <>
                            <p className="text-muted-foreground whitespace-pre-line">{settings.reservationPolicyText}</p>
                            <div className="border-t border-border/30 pt-2.5">
                              <p className="font-semibold mb-1">Cancellation Policy</p>
                              <p className="text-muted-foreground">
                                You can cancel or reschedule up to <span className="font-semibold text-foreground">1 hour</span> before the appointment time.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground">
                              After scheduling an appointment, kindly wait for confirmation.
                            </p>
                            {hasPayablePrice && (
                              <div className="border-t border-border/30 pt-2.5">
                                <>
                                  <p className="font-semibold text-amber-500 mb-1">Down Payment Required</p>
                                  <p className="text-muted-foreground">
                                    To secure your slot, a <span className="font-semibold text-foreground">₱{totalPrice}</span> down payment is required as a reservation fee.
                                  </p>
                                  <p className="text-red-400 font-semibold mt-1">NON-REFUNDABLE</p>
                                  <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                    <p className="text-xs text-amber-600 font-medium">GCash: {gcashNumber}</p>
                                  </div>
                                </>
                              </div>
                            )}
                            {hasPayablePrice && (
                              <div className="border-t border-border/30 pt-2.5">
                                <p className="font-semibold">No reservation fee = No confirmed booking</p>
                              </div>
                            )}
                            <div className="border-t border-border/30 pt-2.5">
                              <p className="font-semibold mb-1">Cancellation Policy</p>
                              <p className="text-muted-foreground">
                                You can cancel or reschedule up to <span className="font-semibold text-foreground">1 hour</span> before the appointment time.
                              </p>
                            </div>
                          </>
                        )}
                        {/* Show the GCash payment block only when selected services have a payable amount */}
                        {settings?.reservationPolicyText && hasPayablePrice && (
                          <div className="border-t border-border/30 pt-2.5">
                            <p className="font-semibold text-amber-500 mb-1">Down Payment: ₱{totalPrice}</p>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                              <p className="text-xs text-amber-600 font-medium">GCash: {gcashNumber}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policyAccepted}
                          onChange={(e) => setPolicyAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-muted-foreground leading-snug">
                          {hasPayablePrice
                            ? `I have read and agree to the booking policy, including the non-refundable ₱${totalPrice} down payment.`
                            : "I have read and agree to the booking policy."}
                        </span>
                      </label>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">Walk-in Policy</p>
                      <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-2 text-sm text-muted-foreground">
                        <p>You'll be added to the live queue. No down payment is required for walk-ins.</p>
                        <p>Queue position may change depending on arrivals. Please arrive on time.</p>
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policyAccepted}
                          onChange={(e) => setPolicyAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-muted-foreground">I understand the walk-in policy.</span>
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* ── Step 6: Contact Details ── */}
              {step === 6 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter your contact information</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-name">Full Name *</Label>
                    <Input
                      id="modal-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="bg-input/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-phone">
                      Phone Number *{" "}
                      <span className="text-xs text-muted-foreground font-normal">(09XX or +63)</span>
                    </Label>
                    <Input
                      id="modal-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(""); }}
                      onBlur={() => {
                        if (phone && !isValidPHPhone(phone))
                          setPhoneError("Enter a valid PH number: 09XXXXXXXXX or +639XXXXXXXXX");
                      }}
                      placeholder="09XX XXX XXXX"
                      className={cn("bg-input/50 border-border/50", phoneError && "border-red-500")}
                    />
                    {phoneError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {phoneError}
                      </p>
                    )}
                  </div>
                  {type === "reservation" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-email">
                        Email Address *{" "}
                        <span className="text-xs text-muted-foreground font-normal">(for booking confirmation)</span>
                      </Label>
                      <Input
                        id="modal-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="bg-input/50 border-border/50"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 7: Confirm ── */}
              {step === 7 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Review your booking</p>
                  <div className="bg-muted/30 rounded-2xl p-4 space-y-3 border border-border/50">
                    {[
                      { label: "Type", value: type === "walkin" ? "Walk-in Queue" : "Reservation" },
                      { label: "Barber", value: selectedBarber?.name },
                      { label: priceLabel, value: `₱${totalPrice}` },
                      { label: "Service(s)", value: selectedServices.map((s) => s.name).join(", ") },
                      { label: "Customer", value: name },
                      { label: "Phone", value: phone },
                      ...(email ? [{ label: "Email", value: email }] : []),
                      ...(type === "reservation" && date && time
                        ? [{ label: "Schedule", value: `${format(date, "MMM d, yyyy")} at ${time}` }]
                        : []),
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex justify-between items-start text-sm border-b border-border/30 pb-2.5 last:border-0 last:pb-0"
                      >
                        <span className="text-muted-foreground shrink-0 mr-4">{label}</span>
                        <span className="font-medium text-right break-words max-w-[65%]">{value}</span>
                      </div>
                    ))}
                    {notes && (
                      <div className="text-sm border-b border-border/30 pb-2.5">
                        <span className="text-muted-foreground block mb-1.5">Notes</span>
                        <div className="bg-muted/40 border border-border/30 rounded-xl px-3 py-2 max-h-20 overflow-y-auto text-xs leading-relaxed break-words whitespace-pre-wrap">
                          {notes}
                        </div>
                      </div>
                    )}
                    {hasPayablePrice && (
                      <div className="flex justify-between items-center pt-1.5 text-base border-t border-border/50 mt-1">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-primary text-xl">₱{totalPrice}</span>
                      </div>
                    )}
                  </div>
                  {type === "reservation" && hasPayablePrice && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-amber-600">
                        Send <strong>₱{totalPrice}</strong> via GCash <strong>{gcashNumber}</strong> to confirm your reservation.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 px-6 py-4 border-t border-border/30">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11"
            onClick={step === 1 ? handleClose : goPreviousStep}
            disabled={submitting}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={goNextStep}
              disabled={!canProceed()}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Booking</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
