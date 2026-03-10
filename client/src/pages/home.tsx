import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { BookingModal } from "@/components/booking/BookingModal";
import { barbers, mockQueue, Barber } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Facebook, Mail, CheckCircle2, Navigation } from "lucide-react";
import LogoImg from "@assets/image_1773147860918.png";

export default function Home() {
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const handleBook = (barber: Barber) => {
    setSelectedBarber(barber);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      
      <BookingModal 
        open={bookingOpen} 
        onOpenChange={setBookingOpen} 
        barber={selectedBarber} 
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Abstract Background Elements */}
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
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Est. 2018</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] font-heading">
                CLEAN CUTS.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-600">
                  PROFESSIONAL
                </span><br />
                BARBERS.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Experience premium grooming at RK Barbershop. Book a reservation or join our live walk-in queue today.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 h-14 rounded-full font-semibold" asChild>
                  <a href="#barbers">Book Appointment</a>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-full border-border/50 bg-background/50 backdrop-blur-sm" asChild>
                  <a href="#queue">View Live Queue</a>
                </Button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative lg:ml-auto"
            >
              <div className="relative w-full max-w-md mx-auto aspect-square rounded-[2rem] overflow-hidden border border-border/50 shadow-2xl bg-card">
                <div className="absolute inset-0 bg-gradient-to-tr from-background/80 to-transparent z-10" />
                <img src={LogoImg} alt="RK Barbershop Logo" className="w-full h-full object-contain p-8 relative z-0" />
                
                {/* Barber pole detail */}
                <div className="absolute bottom-0 left-0 w-full h-2 barber-pole-stripe z-20" />
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-card border border-border/50 shadow-xl rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="text-primary w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold">6 Expert Barbers</p>
                  <p className="text-sm text-muted-foreground">Ready for you</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Queue Section */}
      <section id="queue" className="py-20 bg-muted/20 border-y border-border/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">Live Queue Board</h2>
            <p className="text-muted-foreground">
              Walking in? Check our real-time queue status before you arrive. We'll add you to the board when you get here.
            </p>
          </div>
          
          <QueueBoard queue={mockQueue} />
        </div>
      </section>

      {/* Barbers & Booking Section */}
      <section id="barbers" className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">Our Master Barbers</h2>
              <p className="text-muted-foreground text-lg">
                Select a barber to see their pricing and book your slot.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {barbers.map((barber) => (
              <motion.div
                key={barber.id}
                whileHover={{ y: -5 }}
                className="group bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all shadow-sm hover:shadow-xl"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent z-10" />
                  <img 
                    src={barber.image} 
                    alt={barber.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <h3 className="text-2xl font-bold text-white mb-1 font-heading">{barber.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <Clock className="w-4 h-4" />
                      <span>Next available: {barber.nextAvailable}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-muted/50 p-3 rounded-xl border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Reservation</p>
                      <p className="text-xl font-bold">₱{barber.reservePrice}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-xl border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Walk-in</p>
                      <p className="text-xl font-bold">₱{barber.walkinPrice}</p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-semibold h-12 rounded-xl transition-all"
                    onClick={() => handleBook(barber)}
                  >
                    Book Now
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Location */}
      <section id="contact" className="py-24 bg-card border-t border-border/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[30vw] h-[30vw] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 font-heading">Visit Our Shop</h2>
              <p className="text-muted-foreground mb-10 text-lg">
                Located in the heart of Lemery. Drop by for a fresh cut or reach out to us on our socials.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Address</h4>
                    <p className="text-muted-foreground mt-1">
                      Sanggalang Street, Maguihan<br />
                      Lemery, Batangas, Philippines
                    </p>
                    <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2 font-medium">
                      <Navigation className="w-4 h-4" /> Get Directions
                    </a>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Hours</h4>
                    <p className="text-muted-foreground mt-1">
                      Monday - Sunday<br />
                      9:00 AM - 8:00 PM
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Contact</h4>
                    <a href="mailto:roldandelacerna534@gmail.com" className="text-muted-foreground hover:text-primary transition-colors block mt-1">
                      roldandelacerna534@gmail.com
                    </a>
                    <div className="flex gap-4 mt-3">
                      <a href="https://www.facebook.com/profile.php?id=100083288351696" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Facebook className="w-5 h-5" />
                      </a>
                      <a href="https://www.tiktok.com/@rkbarber18" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors font-bold text-lg leading-none">
                        TikTok
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="h-[400px] lg:h-auto min-h-[400px] rounded-3xl overflow-hidden border border-border/50 bg-muted/30 relative">
              {/* Map Mockup */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80')] bg-cover bg-center opacity-40 grayscale" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-background/80 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center animate-bounce">
                    <MapPin className="text-primary-foreground w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">RK Barbershop</p>
                    <p className="text-xs text-muted-foreground">Lemery, Batangas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30 bg-background text-center">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scissors className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-lg">RK BARBERSHOP</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} RK Barbershop. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}