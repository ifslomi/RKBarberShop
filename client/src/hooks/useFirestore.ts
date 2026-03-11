import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  onBarbersSnapshot,
  onQueueSnapshot,
  onSettingsSnapshot,
  onServicesSnapshot,
} from "@/lib/firestore";
import { adminGetBookings } from "@/lib/adminApi";
import type { Barber, Booking, QueueItem, ShopSettings, Service } from "@/lib/types";

export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onBarbersSnapshot(
      (data) => { setBarbers(data); setLoading(false); },
      (err) => { console.error("Barbers snapshot error:", err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { barbers, loading, error };
}

export function useQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onQueueSnapshot(
      (data) => { setQueue(data); setLoading(false); },
      (err) => { console.error("Queue snapshot error:", err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { queue, loading, error };
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBookings() {
      try {
        const data = await adminGetBookings();
        if (!mounted) return;
        setBookings(data);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load bookings";
        console.error("Admin bookings fetch error:", err);
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;

      if (!user) {
        setBookings([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      loadBookings();
    });

    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  return { bookings, loading, error };
}

export function useTodayBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    async function loadTodayBookings() {
      try {
        const data = await adminGetBookings(today);
        if (!mounted) return;
        setBookings(data);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load today's bookings";
        console.error("Admin today bookings fetch error:", err);
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;

      if (!user) {
        setBookings([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      loadTodayBookings();
    });

    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  return { bookings, loading, error };
}

export function useSettings() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSettingsSnapshot(
      (data) => { setSettings(data); setLoading(false); },
      (err) => { console.error("Settings snapshot error:", err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { settings, loading, error };
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onServicesSnapshot(
      (data) => { setServices(data); setLoading(false); },
      (err) => { console.error("Services snapshot error:", err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { services, loading, error };
}
