import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Barber, mockTimeslots } from "@/lib/data";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber | null;
}

export function BookingModal({ open, onOpenChange, barber }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<"reservation" | "walkin">("reservation");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>();
  const { toast } = useToast();

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Booking Confirmed!",
      description: `Your ${type} with ${barber?.name} has been secured.`,
    });
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setType("reservation");
      setDate(undefined);
      setTime(undefined);
    }, 500);
  };

  if (!barber) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Book with {barber.name}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose your service type."}
            {step === 2 && "Select a date and time."}
            {step === 3 && "Enter your details."}
            {step === 4 && "Confirm your booking."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  step >= i ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          <form id="booking-form" onSubmit={handleConfirm}>
            {/* Step 1: Service Type */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="grid grid-cols-2 gap-4">
                  <div>
                    <RadioGroupItem value="reservation" id="reservation" className="peer sr-only" />
                    <Label
                      htmlFor="reservation"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Clock className="mb-3 h-6 w-6" />
                      <span className="font-semibold">Reservation</span>
                      <span className="text-sm text-muted-foreground">₱{barber.reservePrice}</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="walkin" id="walkin" className="peer sr-only" />
                    <Label
                      htmlFor="walkin"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <User className="mb-3 h-6 w-6" />
                      <span className="font-semibold">Walk-in Queue</span>
                      <span className="text-sm text-muted-foreground">₱{barber.walkinPrice}</span>
                    </Label>
                  </div>
                </RadioGroup>
                {type === "walkin" && (
                  <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-md">
                    Walk-ins are added to the live queue for today. You will be seen as soon as the barber is available.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Date & Time (Only for Reservation) */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                {type === "reservation" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-input/50 border-border/50",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-border/50">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            className="bg-card"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Slot</Label>
                      <Select value={time} onValueChange={setTime}>
                        <SelectTrigger className="bg-input/50 border-border/50">
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent className="border-border/50">
                          {mockTimeslots.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Joining Today's Queue</h4>
                      <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                        You'll be added to {barber.name}'s queue immediately upon confirmation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" required className="bg-input/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="09XX XXX XXXX" required className="bg-input/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input id="notes" placeholder="Any specific haircut style?" className="bg-input/50 border-border/50" />
                </div>
              </div>
            )}

            {/* Step 4: Summary */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="bg-accent/30 rounded-xl p-5 space-y-3 border border-border/50">
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground">Barber</span>
                    <span className="font-semibold">{barber.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground">Service Type</span>
                    <span className="font-semibold capitalize">{type}</span>
                  </div>
                  {type === "reservation" && date && time && (
                    <div className="flex justify-between items-center pb-3 border-b border-border/50">
                      <span className="text-muted-foreground">Schedule</span>
                      <span className="font-semibold text-right">
                        {format(date, "MMM d, yyyy")}<br/>at {time}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 text-lg">
                    <span>Total Price</span>
                    <span className="font-bold text-primary">
                      ₱{type === "reservation" ? barber.reservePrice : barber.walkinPrice}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex justify-between gap-3 mt-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack} className="w-full">
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
              Cancel
            </Button>
          )}

          {step < 4 ? (
            <Button 
              onClick={handleNext} 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={step === 2 && type === "reservation" && (!date || !time)}
            >
              Next
            </Button>
          ) : (
            <Button 
              type="submit" 
              form="booking-form" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirm Booking
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}