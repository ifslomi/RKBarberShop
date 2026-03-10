import { useState } from "react";
import { Link } from "wouter";
import { Menu, X, Scissors, Calendar, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Services", href: "#services" },
    { name: "Barbers", href: "#barbers" },
    { name: "Live Queue", href: "#queue" },
    { name: "Location", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">RK BARBERSHOP</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4 border-l border-border/50 pl-6">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-muted-foreground">Admin</Button>
              </Link>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-6">
                <a href="#barbers">Book Now</a>
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-background border-b border-border/50 py-4 px-4 shadow-2xl animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-lg font-medium p-2 rounded-lg hover:bg-accent/50"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
              <Button asChild className="w-full bg-primary text-primary-foreground">
                <a href="#barbers" onClick={() => setIsOpen(false)}>Book Reservation</a>
              </Button>
              <Link href="/admin">
                <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}