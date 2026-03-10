import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { QueueModal } from "@/components/queue/QueueModal";
import { BookingModal } from "@/components/booking/BookingModal";
import { useBarbers, useQueue, useSettings, useServices } from "@/hooks/useFirestore";
import { Button } from "@/components/ui/button";
import {
  MapPin, Clock, CheckCircle2, Loader2, Scissors,
  ArrowRight, Users, Star,
} from "lucide-react";
import LogoImg from "@assets/rkbarber-logo-transparent.png";

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const { barbers, loading: barbersLoading } = useBarbers();
  const { queue, loading: queueLoading } = useQueue();
  const { settings } = useSettings();
  const { services } = useServices();

  const activeBarbers = barbers.filter((b) => b.active);
  const activeServices = services.filter((s) => s.active);
  const shopName = settings?.shopName || "RK Barbershop";
  const aboutText =
    settings?.aboutText ||
    "Since 2018, RK Barbershop has been delivering premium grooming services in Lemery. We pride ourselves on professional excellence, affordable pricing, and a welcoming atmosphere for every customer.";

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar onBookClick={() => setBookingOpen(true)} onQueueClick={() => setQueueOpen(true)} />

      <BookingModal open={bookingOpen} onOpenChange={setBookingOpen} />
      <QueueModal
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={queue}
        barbers={activeBarbers}
        loading={queueLoading || barbersLoading}
      />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-secondary/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50 border border-border mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Est. 2018
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] font-heading">
                CLEAN CUTS.<br />
                <span className="text-primary">PROFESSIONAL</span><br />
                BARBERS.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Experience premium grooming at {shopName}. Book a reservation or
                join our live walk-in queue today.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 h-14 rounded-full font-semibold"
                  onClick={() => setBookingOpen(true)}
                >
                  Book Appointment
                </Button>
                <Button
                  size="lg"
                  type="button"
                  variant="outline"
                  className="text-lg px-8 h-14 rounded-full border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50 transition-colors"
                  onClick={() => setQueueOpen(true)}
                >
                  View Live Queue
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center gap-6 lg:ml-auto"
            >
              <img
                src={LogoImg}
                alt={`${shopName} Logo`}
                className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain drop-shadow-[0_0_60px_rgba(242,183,5,0.25)]"
              />
              <div className="bg-card border border-border/50 shadow-xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="text-primary w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">
                    {activeBarbers.length} Expert Barber{activeBarbers.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">Ready for you</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── About ──────────────────────────────────────────── */}
      <section id="about" className="py-20 md:py-28 bg-card border-b border-border/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold font-heading">About {shopName}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{aboutText}</p>
              <div className="grid md:grid-cols-3 gap-8 pt-8">
                {[
                  { icon: CheckCircle2, title: "Expert Barbers", desc: `${activeBarbers.length} highly trained professionals dedicated to your grooming.` },
                  { icon: Clock, title: "Quick Service", desc: "Efficient bookings and real-time queue tracking so you always know when to arrive." },
                  { icon: Star, title: "Affordable Rates", desc: "Premium quality at competitive prices. Walk-in from ₱80, reservations from ₱120." },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.div
                    key={title}
                    whileHover={{ y: -4 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="p-6 bg-muted/30 rounded-2xl border border-border/50"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────── */}
      <section id="services" className="py-20 md:py-28 border-b border-border/30">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">Our Services</h2>
            <p className="text-muted-foreground">
              From classic haircuts to full grooming packages — pick what suits you best when booking.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeServices.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}
                className="bg-card border border-border/50 hover:border-primary/40 rounded-2xl p-6 transition-all cursor-default"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xl font-bold text-primary">₱{service.price}</span>
                </div>
                <h3 className="font-bold text-base mb-1">{service.name}</h3>
                {service.description && (
                  <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{service.duration} mins</span>
                </div>
              </motion.div>
            ))}
          </div>


        </div>
      </section>



      {/* ── Meet Our Team CTA ──────────────────────────────── */}
      <section className="py-20 md:py-28 border-b border-border/30">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card border border-border/50 rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-8 text-center md:text-left"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0 mx-auto md:mx-0">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3">
                Meet Our <span className="text-primary">Master Barbers</span>
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Get to know our team of skilled professionals. Check availability, specialties,
                and pricing — then book directly with your preferred barber.
              </p>
            </div>
            <Link href="/barbers">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 h-13 shrink-0 font-semibold whitespace-nowrap"
              >
                View Our Team <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Visit Our Shop CTA ─────────────────────────────── */}
      <section className="py-20 md:py-28 bg-card border-b border-border/30">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left"
          >
            <div className="flex-1 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold font-heading">
                Visit Our <span className="text-primary">Shop</span>
              </h2>
              <p className="text-muted-foreground max-w-lg">
                Located in {settings?.city || "Lemery, Batangas"}. Open{" "}
                {settings?.operatingDays || "Monday – Sunday"},{" "}
                {settings?.openTime || "9:00 AM"} – {settings?.closeTime || "8:00 PM"}.
              </p>
              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  {settings?.address || "Sanggalang Street, Maguihan"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  Open daily
                </div>
              </div>
              <Link href="/location">
                <Button
                  className="bg-foreground text-background hover:bg-primary hover:text-primary-foreground rounded-full px-8 h-12 font-semibold mt-2"
                >
                  Get Directions <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="w-full md:w-96 h-56 rounded-2xl overflow-hidden border border-border/50 relative shrink-0">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15495.646271256024!2d120.90119!3d13.87014!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bd1444b1a0e8b7%3A0x3c4e13a0a94d2337!2sLemery%2C%20Batangas!5e0!3m2!1sen!2sph!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="RK Barbershop Location"
                className="absolute inset-0"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="py-8 pb-24 md:pb-8 border-t border-border/30 bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={LogoImg} alt={shopName} className="w-8 h-8 object-contain" />
            <span className="font-heading font-bold text-lg">{shopName.toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-4">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <button type="button" onClick={() => setQueueOpen(true)} className="hover:text-foreground transition-colors">Queue</button>
            <Link href="/barbers" className="hover:text-foreground transition-colors">Team</Link>
            <Link href="/location" className="hover:text-foreground transition-colors">Location</Link>
          </div>
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} {shopName}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-lg border-t border-border/50 p-3">
        <Button
          type="button"
          size="lg"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12 rounded-xl"
          onClick={() => setBookingOpen(true)}
        >
          Book an Appointment
        </Button>
      </div>
    </div>
  );
}
