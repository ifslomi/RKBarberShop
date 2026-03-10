import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, MapPin, Clock, Mail, Facebook, Navigation, Phone } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useSettings } from "@/hooks/useFirestore";
import LogoImg from "@assets/rkbarber-logo-transparent.png";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.88a8.28 8.28 0 0 0 4.76 1.5V6.93a4.84 4.84 0 0 1-1-.24z" />
    </svg>
  );
}

export default function LocationPage() {
  const { settings } = useSettings();

  const shopName = settings?.shopName || "RK Barbershop";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-28 pb-12 border-b border-border/30">
        <div className="container mx-auto px-4 md:px-6">
          <Link href="/">
            <button type="button" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <img src={LogoImg} alt={shopName} className="w-8 h-8 object-contain" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Visit Us</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-heading mb-4">
              Our <span className="text-primary">Location</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Find us in Lemery, Batangas. Drop by anytime during shop hours for a fresh cut.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-8"
            >
              {/* Address */}
              <div className="flex gap-4 items-start p-5 bg-card rounded-2xl border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Address</h4>
                  <p className="text-muted-foreground">
                    {settings?.address || "Sanggalang Street, Maguihan"}<br />
                    {settings?.city || "Lemery, Batangas"}<br />
                    {settings?.country || "Philippines"}
                  </p>
                  <a
                    href={settings?.googleMapsUrl || "https://www.google.com/maps/place/Lemery,+Batangas/"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3 font-medium"
                  >
                    <Navigation className="w-4 h-4" /> Get Directions
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className="flex gap-4 items-start p-5 bg-card rounded-2xl border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Shop Hours</h4>
                  <p className="text-muted-foreground">
                    {settings?.operatingDays || "Monday – Sunday"}<br />
                    {settings?.openTime || "9:00 AM"} – {settings?.closeTime || "8:00 PM"}
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="flex gap-4 items-start p-5 bg-card rounded-2xl border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1">Contact</h4>
                  <a
                    href={`mailto:${settings?.email || "roldandelacerna534@gmail.com"}`}
                    className="text-muted-foreground hover:text-primary transition-colors block"
                  >
                    {settings?.email || "roldandelacerna534@gmail.com"}
                  </a>
                  <div className="flex gap-4 mt-4">
                    <a
                      href={settings?.facebookUrl || "https://www.facebook.com/profile.php?id=100083288351696"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Facebook className="w-4 h-4" />
                      </div>
                      Facebook
                    </a>
                    <a
                      href={settings?.tiktokUrl || "https://www.tiktok.com/@rkbarber18"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <TikTokIcon className="w-4 h-4" />
                      </div>
                      TikTok
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Map */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-[420px] lg:h-full min-h-[360px] rounded-3xl overflow-hidden border border-border/50 relative"
            >
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
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="py-6 border-t border-border/30 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {shopName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
