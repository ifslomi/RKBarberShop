import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import LogoImg from "@assets/rkbarber-logo-transparent.png";

interface NavbarProps {
  onBookClick?: () => void;
  onQueueClick?: () => void;
}

export function Navbar({ onBookClick, onQueueClick }: NavbarProps = {}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 group">
            <img src={LogoImg} alt="RK Barbershop" className="w-7 h-7 object-contain group-hover:scale-105 transition-transform" />
            <span className="font-heading font-bold text-sm tracking-widest uppercase">RK Barbershop</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5">
            <a href="#about" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#services" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Services</a>
            {onQueueClick ? (
              <button type="button" onClick={onQueueClick} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Queue</button>
            ) : (
              <Link href="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Queue</Link>
            )}
            <Link href="/barbers" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Our Team</Link>
            <Link href="/location" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Location</Link>

            <div className="flex items-center gap-2 border-l border-border/40 pl-5">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8 px-3">Login</Button>
              </Link>
              {onBookClick ? (
                <Button size="sm" onClick={onBookClick} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full h-8 px-4 text-xs">Book Now</Button>
              ) : (
                <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full h-8 px-4 text-xs">
                  <Link href="/barbers">Book Now</Link>
                </Button>
              )}
            </div>
          </div>

          <button className="md:hidden p-2 text-foreground hover:bg-accent/50 rounded-lg transition-colors" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden absolute top-14 left-0 w-full bg-background border-b border-border/50 overflow-hidden shadow-2xl"
          >
            <div className="py-3 px-4 flex flex-col gap-1">
              <a href="#about" className="text-sm font-medium p-2.5 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => setIsOpen(false)}>About</a>
              <a href="#services" className="text-sm font-medium p-2.5 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => setIsOpen(false)}>Services</a>
              {onQueueClick ? (
                <button type="button" className="text-left text-sm font-medium p-2.5 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => { onQueueClick(); setIsOpen(false); }}>Queue</button>
              ) : (
                <Link href="/" className="text-sm font-medium p-2.5 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => setIsOpen(false)}>Queue</Link>
              )}
              <Link href="/barbers" className="text-sm font-medium p-2.5 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => setIsOpen(false)}>Our Team</Link>
              <Link href="/location" className="text-sm font-medium p-2.5 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => setIsOpen(false)}>Location</Link>
              <div className="pt-2 mt-1 border-t border-border/50 flex flex-col gap-2">
                {onBookClick ? (
                  <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { onBookClick(); setIsOpen(false); }}>Book Appointment</Button>
                ) : (
                  <Button size="sm" asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/barbers" onClick={() => setIsOpen(false)}>Book Appointment</Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild className="w-full hover:bg-accent/50">
                  <Link href="/admin" onClick={() => setIsOpen(false)}>Admin Login</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}