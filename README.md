# RK Barbershop System

## 1. Overview
RK Barbershop is a full booking and shop management system.

It has two sides:
- Customer side: public website for booking and queue joining
- Admin side: dashboard for services, barbers, bookings, queue, and settings

The project uses React on the client, Firebase Firestore as database, Firebase Auth for admin login, and Node/Express plus Vercel serverless APIs for backend operations.

---

## 2. What Is Included

### 2.1 Customer Features
- View shop information, services, barbers, and location
- Book appointment in guided steps
- Choose booking type:
  - Reservation
  - Walk-in
- Choose barber
- Choose one or more services
- Enter personal details and notes
- View booking summary before submit

### 2.2 Pricing Features
- Price now comes from barber rates, based on customer choice:
  - Reservation uses barber reserve price
  - Walk-in uses barber walk-in price
- Step 2 (Choose Barber) shows the selected type price
- Review step shows the booking price and total
- Admin booking table and booking detail card show correct fallback price for older records

### 2.3 Service Features
- Services can be marked as no price
- If no price is enabled, price is hidden from customer-facing service lists
- Admin service edit now correctly detects old no-price records with zero amount

### 2.4 Booking Security and Confirmation Features
- Reservation bookings are created through backend API, not direct client write
- Server computes final booking price to prevent client tampering
- Reservation sends customer action email with secure links:
  - Accept
  - Cancel
  - Request Reschedule
- Token in email is hashed in database for safety
- Admin cannot confirm reservation until customer accepted from email
- If customer does not act before one hour before appointment time, reservation is auto-cancelled
- Walk-in bookings do not require email confirmation

### 2.5 Admin Dashboard Features
- Dashboard overview stats
- Service management
- Barber management
- Booking management
- Queue management
- Shop settings management
- Booking detail dialog with customer confirmation state

### 2.6 Real-Time Features
- Admin bookings list updates in real time using Firestore snapshots
- No manual refresh needed for:
  - Delete booking
  - Status changes
  - Customer email actions (accept, cancel, reschedule)

---

## 3. Recent Major Updates
- Added no-price checkbox and behavior for services
- Removed duration display where not needed in booking and service surfaces
- Changed booking pricing model to barber-based prices by booking type
- Improved booking policy layout spacing in step 5
- Added reservation email action flow (accept, cancel, reschedule)
- Added anti-scam protection:
  - Server-side price calculation
  - Customer acceptance required before admin confirmation
  - Automatic cancellation when no customer action before cutoff
- Added cron-based expiry endpoint
- Made admin bookings fully real time
- Fixed TypeScript build issues in booking action API
- Adjusted Vercel cron schedule for Hobby plan limits

---

## 4. How The System Works

### 4.1 High-Level Flow
1. Customer opens website and submits booking form
2. Frontend sends booking data to backend API endpoint
3. Backend validates input and loads barber record
4. Backend calculates booking price by booking type
5. Backend stores booking in Firestore
6. If reservation:
   - backend creates secure action token hash
   - backend sends email links (accept, cancel, reschedule)
7. Customer action updates booking state through secure action endpoint
8. Admin dashboard listens in real time and updates instantly
9. Auto-expire endpoint cancels unattended reservation when time window is passed

### 4.2 Reservation State Logic
- New reservation: pending + customerDecision awaiting
- Customer accept: booking status confirmed
- Customer cancel: booking status cancelled
- Customer reschedule request: remains pending with reschedule request decision
- No customer action before cutoff: auto-cancelled with expired decision

### 4.3 Price Logic
- Reservation total = selected barber reserve price
- Walk-in total = selected barber walk-in price
- Service line prices can be hidden for no-price services

---

## 5. Architecture

### 5.1 Frontend
- React + TypeScript
- Vite build
- Firestore real-time listeners for live updates

### 5.2 Backend (Local / Node)
- Express server in server folder
- Admin APIs with Firebase Admin SDK
- Public booking APIs for secure reservation flow

### 5.3 Backend (Vercel)
- Serverless API functions in api folder
- Same booking action and admin logic available for deployment

### 5.4 Database
- Firebase Firestore collections:
  - barbers
  - services
  - bookings
  - queue
  - settings

### 5.5 Auth
- Firebase Auth for admin sign-in
- Admin access controlled by allowlist and admin checks

---

## 6. Project Structure
- client: frontend app
- server: Express backend used in local and production node runtime
- api: Vercel serverless functions
- shared: shared schema/types used by server
- script: build scripts

---

## 7. Requirements

### 7.1 Software Needed
- Node.js 20 or newer
- npm
- Git
- Code editor (VS Code recommended)

### 7.2 Accounts Needed
- Firebase account and project
- Vercel account (for deployment)
- Brevo account (for SMTP booking emails)

### 7.3 Services Needed
- Firebase Firestore enabled
- Firebase Authentication enabled
- Firebase service account for admin SDK
- SMTP credentials from Brevo

---

## 8. Environment Variables
Use .env for local and Vercel Project Settings for deployment.

You can start from .env.example.

### 8.1 Client Variables
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID

### 8.2 Server Variables
- ADMIN_EMAIL_ALLOWLIST
- ADMIN_EMAIL
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

### 8.3 Booking Security Variables
- PUBLIC_BASE_URL
- BOOKING_TOKEN_SECRET
- CRON_SECRET

### 8.4 SMTP Variables (Brevo)
- SMTP_HOST=smtp-relay.brevo.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=your Brevo SMTP login
- SMTP_PASS=your Brevo SMTP key
- BOOKING_FROM_EMAIL=verified sender email in Brevo

Important:
- BOOKING_FROM_EMAIL must be a verified sender/domain in Brevo
- Never commit real secret keys to git
- Rotate keys if exposed

---

## 9. Local Setup Step by Step
1. Clone repository
2. Install dependencies
3. Create .env from .env.example
4. Fill all required environment variables
5. Run development server
6. Open app in browser

Commands:

```bash
git clone <your-repo-url>
cd RKBarberShop
npm install
cp .env.example .env
npm run dev
```

Default local URL:
- http://localhost:5000

---

## 10. Firebase Setup Guide
1. Create Firebase project
2. Add Web App and copy web config values into VITE_ variables
3. Enable Firestore Database
4. Enable Authentication (Email/Password)
5. Create admin user account
6. Create service account key in Firebase Console
7. Put service account values in FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

---

## 11. Brevo SMTP Setup Guide
1. Create Brevo account
2. Go to SMTP and API page
3. Generate SMTP key
4. Verify sender email/domain
5. Set SMTP variables in .env and Vercel env

Suggested values:
- SMTP_HOST=smtp-relay.brevo.com
- SMTP_PORT=587
- SMTP_SECURE=false

---

## 12. Vercel Deployment Guide
1. Push repository to GitHub
2. Import project in Vercel
3. Add all environment variables in Vercel Project Settings
4. Deploy

Cron note:
- Vercel Hobby only supports daily cron
- Current schedule in vercel.json is daily
- For higher frequency on free tier, use external scheduler and call:
  - /api/cron/expire-bookings?secret=YOUR_CRON_SECRET

---

## 13. API Endpoints Summary

### 13.1 Public Booking Endpoints
- POST /api/bookings
  - Create booking with secure server-side price calculation
- GET /api/bookings/action?action=accept|cancel|reschedule&token=...
  - Customer booking action from email links
- GET /api/cron/expire-bookings
  - Auto-cancel unattended reservations past action window

### 13.2 Admin Endpoints
- GET /api/admin/bookings
- PATCH /api/admin/bookings/:id
- DELETE /api/admin/bookings/:id
- PATCH /api/admin/queue/:id
- DELETE /api/admin/queue/:id
- POST /api/admin/services
- PATCH /api/admin/services/:id
- DELETE /api/admin/services/:id
- POST /api/admin/barbers
- PATCH /api/admin/barbers/:id
- DELETE /api/admin/barbers/:id
- PATCH /api/admin/settings

---

## 14. User Roles

### 14.1 Customer
- Can create booking
- Can act on reservation through email links

### 14.2 Admin
- Can manage barbers/services/queue/settings
- Can manage bookings
- Cannot confirm reservation before customer acceptance

---

## 15. Security Notes
- Price is computed on server, not trusted from client
- Customer action token is hashed in database
- Admin routes require Firebase token and admin authorization
- Optional CRON_SECRET secures cron endpoint
- Keep all credentials in env variables, never in source code

---

## 16. Troubleshooting

### 16.1 POST /api/bookings returns 404 API route not found
Cause:
- Running stale server process
Fix:
- Restart development server

### 16.2 Booking email not sent
Check:
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- BOOKING_FROM_EMAIL is verified in Brevo
- Brevo sender/domain verification status

### 16.3 Admin booking list not updating live
Check:
- Firestore rules and connectivity
- User is on updated build with snapshot-based bookings hooks

### 16.4 Vercel cron error on Hobby
Cause:
- Non-daily cron schedule is not allowed on Hobby
Fix:
- Keep daily cron in vercel.json
- Use external scheduler for more frequent calls

### 16.5 TypeScript build errors in API route
Fix:
- Run npm run check locally
- Confirm latest code includes booking action type fix

---

## 17. Development Commands

```bash
npm run dev      # start development server
npm run build    # build project
npm run start    # run production build
npm run check    # run TypeScript checks
```

---

## 18. Recommended Production Checklist
- All env vars set in Vercel
- Firebase web config and admin service account configured
- Brevo sender/domain verified
- SMTP test successful
- Admin account in allowlist
- Cron strategy confirmed (daily or external scheduler)
- Secrets rotated if ever exposed

---

## 19. Maintenance Notes
- Keep dependencies updated
- Monitor booking action logs and email delivery
- Back up Firestore periodically
- Review admin access allowlist regularly

---

## 20. License and Ownership
- Project owner: RK Barber Shop
- Repository: ifslomi/RKBarberShop

If you need a shorter README for public display and a separate full operator manual, create:
- README.md (short)
- docs/SETUP.md (full setup)
- docs/OPERATIONS.md (daily usage)
