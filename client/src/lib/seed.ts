import { collection, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS, type Barber, type ShopSettings, type Service } from "./types";

const ALL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const DEFAULT_BARBERS: Omit<Barber, "id">[] = [
  { name: "Abu", specialty: "Fades & Designs", reservePrice: 300, walkinPrice: 200, active: true, image: "", order: 1, availableDays: ALL_DAYS, availableFrom: "9:00 AM", availableTo: "8:00 PM", createdAt: new Date().toISOString() },
  { name: "Jaymar", specialty: "Classic Cuts", reservePrice: 300, walkinPrice: 200, active: true, image: "", order: 2, availableDays: ALL_DAYS, availableFrom: "9:00 AM", availableTo: "8:00 PM", createdAt: new Date().toISOString() },
  { name: "JP", specialty: "Modern Styles", reservePrice: 200, walkinPrice: 120, active: true, image: "", order: 3, availableDays: ALL_DAYS, availableFrom: "9:00 AM", availableTo: "8:00 PM", createdAt: new Date().toISOString() },
  { name: "Jienray", specialty: "Beard Grooming", reservePrice: 200, walkinPrice: 120, active: true, image: "", order: 4, availableDays: ALL_DAYS, availableFrom: "9:00 AM", availableTo: "8:00 PM", createdAt: new Date().toISOString() },
  { name: "Demar", specialty: "Skin Fades", reservePrice: 200, walkinPrice: 120, active: true, image: "", order: 5, availableDays: ALL_DAYS, availableFrom: "9:00 AM", availableTo: "8:00 PM", createdAt: new Date().toISOString() },
  { name: "Jomar", specialty: "Textured Cuts", reservePrice: 200, walkinPrice: 120, active: true, image: "", order: 6, availableDays: ALL_DAYS, availableFrom: "9:00 AM", availableTo: "8:00 PM", createdAt: new Date().toISOString() },
];

const DEFAULT_SERVICES: Omit<Service, "id">[] = [
  { name: "Haircut", description: "Precision cut styled to your preference", price: 150, duration: 30, active: true, order: 1, createdAt: new Date().toISOString() },
  { name: "Beard Trim", description: "Clean beard shaping and edge-up", price: 80, duration: 20, active: true, order: 2, createdAt: new Date().toISOString() },
  { name: "Haircut + Beard", description: "Full grooming package", price: 200, duration: 50, active: true, order: 3, createdAt: new Date().toISOString() },
  { name: "Kids Haircut", description: "Gentle cut for kids 12 and below", price: 100, duration: 25, active: true, order: 4, createdAt: new Date().toISOString() },
  { name: "Hot Towel Shave", description: "Traditional straight razor shave", price: 120, duration: 30, active: true, order: 5, createdAt: new Date().toISOString() },
  { name: "Hair Treatment", description: "Deep conditioning and scalp care", price: 180, duration: 40, active: true, order: 6, createdAt: new Date().toISOString() },
];

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "RK Barbershop",
  address: "Sanggalang Street, Maguihan",
  city: "Lemery, Batangas",
  province: "Batangas",
  country: "Philippines",
  openTime: "9:00 AM",
  closeTime: "8:00 PM",
  operatingDays: "Monday - Sunday",
  email: "roldandelacerna534@gmail.com",
  facebookUrl: "https://www.facebook.com/profile.php?id=100083288351696",
  tiktokUrl: "https://www.tiktok.com/@rkbarber18",
  googleMapsUrl: "https://www.google.com/maps/place/Lemery,+Batangas/@13.8825,120.9075,15z",
  tagline: "Clean Cuts. Professional Barbers.",
  aboutText: "Since 2018, RK Barbershop has been delivering premium grooming services in Lemery. We pride ourselves on professional excellence, affordable pricing, and a welcoming atmosphere for every customer.",
};

export async function seedFirestore(): Promise<{
  barbersCreated: number;
  servicesCreated: number;
  settingsCreated: boolean;
}> {
  let barbersCreated = 0;
  let servicesCreated = 0;
  let settingsCreated = false;

  const barbersSnap = await getDocs(collection(db, COLLECTIONS.BARBERS));
  if (barbersSnap.empty) {
    for (const barber of DEFAULT_BARBERS) {
      const ref = doc(collection(db, COLLECTIONS.BARBERS));
      await setDoc(ref, barber);
      barbersCreated++;
    }
  }

  const servicesSnap = await getDocs(collection(db, COLLECTIONS.SERVICES));
  if (servicesSnap.empty) {
    for (const service of DEFAULT_SERVICES) {
      const ref = doc(collection(db, COLLECTIONS.SERVICES));
      await setDoc(ref, service);
      servicesCreated++;
    }
  }

  const settingsSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, "shop"));
  if (!settingsSnap.exists()) {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, "shop"), DEFAULT_SETTINGS);
    settingsCreated = true;
  }

  return { barbersCreated, servicesCreated, settingsCreated };
}
