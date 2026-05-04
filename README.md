# BagPacker

BagPacker is a full-stack travel platform for discovering trips, booking seats, finding travel companions, chatting in real time, and getting AI-assisted travel help.

It includes:
- **Traveler, Organizer, Admin roles**
- **Trip publishing and booking**
- **Razorpay payment flow** (order + signature verification)
- **Booking confirmation + e-ticket email delivery**
- **Traveler dashboard e-tickets**
- **Companion matching and request workflows**
- **Group + direct chat (Socket.IO)**
- **AI Copilot** (packing, route, safety, Q&A)
- **AI trip autofill for organizers**

---

## Tech Stack

### Frontend
- React 19 + Vite
- React Router
- Redux Toolkit
- Tailwind CSS
- Socket.IO client
- React Markdown

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT auth + Google Sign-In
- Socket.IO
- Razorpay API
- Nodemailer (SMTP)
- Cloudinary (image storage)

---

## Monorepo Structure

```text
BagPacker-1/
├── backend/        # Express API + DB + sockets + jobs
│   ├── server/
│   │   ├── api/            # Domain modules (auth, trip, booking, companion, chat, etc.)
│   │   ├── routes/         # Route definitions
│   │   ├── middleware/     # Auth/role/validation/upload middleware
│   │   ├── socket/         # Socket.IO events and helpers
│   │   ├── jobs/           # Maintenance jobs
│   │   └── utils/          # Cloudinary, mailer, helpers
│   └── .env.example
├── frontend/       # React client
│   ├── src/
│   │   ├── pages/          # Route-level pages
│   │   ├── components/     # Shared UI and feature components
│   │   ├── lib/            # API client, auth helpers, alert helpers
│   │   └── store/          # Redux slices/store
├── render.yaml     # Render deployment config
└── README.md
```

---

## Local Setup

## 1) Clone and install

```bash
git clone <your-repo-url>
cd BagPacker-1
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

---

## 2) Environment variables

### Backend (`backend/.env`)

You can copy from `backend/.env.example`.

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bagpacker?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your-google-oauth-client-id

GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant

RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_google_app_password
SMTP_FROM_EMAIL=yourgmail@gmail.com
SMTP_FROM_NAME=BagPacker

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

ADMIN_NAME=BagPacker Admin
ADMIN_EMAIL=admin@bagpacker.com
ADMIN_PHONE=9999999999
ADMIN_PASSWORD=Admin@123
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

> Keep all secrets in backend `.env` only. Never expose private keys in frontend env files.

---

## 3) Run the app

Run backend:

```bash
cd backend
npm run dev
```

Run frontend (new terminal):

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:5173`  
Backend health: `http://localhost:5000/api/health`

---

## Key Scripts

### Backend
- `npm run dev` - start API with nodemon
- `npm start` - start API
- `npm test` - run companion utility tests
- `npm run seed:admin` - seed admin user
- `npm run seed:test-users` - seed sample users
- `npm run job:trip-maintenance` - run trip maintenance job

### Frontend
- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview built app
- `npm run lint` - lint code

---

## Core Feature Flows

## Booking + Payment + E-ticket
1. Traveler chooses trip and pickup point
2. Payment must be enabled on the trip by organizer/admin
3. Backend creates Razorpay order (`/api/bookings/initiate-payment`)
4. Frontend opens Razorpay Checkout
5. Backend verifies signature (`/api/bookings/verify-payment`)
6. Booking marked confirmed, seats reserved, notifications emitted
7. Confirmation email with styled e-ticket sent via SMTP
8. E-ticket appears in Traveler Dashboard

## Organizer AI Trip Autofill
1. Organizer enters source and destination
2. Frontend calls `/api/ai/trip-autofill`
3. Backend asks AI planner and returns normalized trip draft
4. Form auto-fills title, dates, description, seats, itinerary, pickup points

## Traveler AI Copilot
- Endpoint: `/api/ai/copilot`
- Intents: `packing`, `route`, `safety`, `qa`
- Context-aware responses based on route/date/chat context

---

## Role Capabilities

### Traveler
- Search and view trips
- Pay and confirm bookings
- Receive booking confirmation + e-ticket email
- View e-tickets in traveler dashboard
- Find and manage companion requests
- Use AI travel copilot
- Chat in accepted/group rooms

### Organizer
- Create and edit trips
- Set transport type for each trip
- Enable/disable online payment per trip
- Start trip lifecycle
- Upload trip images
- Use AI trip autofill in trip creation
- Manage organizer dashboard data

### Admin
- Access admin dashboard routes
- Manage platform-level moderation workflows
- Monitor trip listings and lifecycle
- Monitor payment records and statuses
- Monitor companion join activity
- Review platform feedback/reviews

---

## Booking & Payment State Model

### Booking status (`status`)
- `pending` - booking created but not confirmed
- `confirmed` - payment verified and seats allocated
- `cancelled` - booking cancelled
- `completed` - trip finished and marked complete

### Payment status (`paymentStatus`)
- `created` - Razorpay order created
- `paid` - payment verified
- `failed` - signature/payment verification failed
- `refund_required` - payment succeeded but seats unavailable at verification time
- `refunded` - refund completed manually/system-side

---

## Important API Endpoints (practical)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`

### Trips
- `GET /api/trips`
- `GET /api/trips/:id`
- `POST /api/trips` (organizer)
- `PUT /api/trips/:id` (organizer)
- `PUT /api/trips/:id/start` (organizer)

### Bookings + Razorpay
- `POST /api/bookings/initiate-payment`
- `POST /api/bookings/verify-payment`
- `GET /api/bookings/my`
- `PUT /api/bookings/:id/cancel`
- `PUT /api/bookings/:id/complete`

### AI
- `POST /api/ai/copilot`
- `POST /api/ai/trip-autofill` (organizer)

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`

### Admin Monitoring
- `GET /api/admin/trip-listings`
- `PUT /api/admin/trip-listings/:id/lifecycle`
- `GET /api/admin/payments`
- `GET /api/admin/join-activity`
- `GET /api/admin/reviews`

---

## Sample Requests

### Initiate booking payment

```http
POST /api/bookings/initiate-payment
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "tripId": "664f0b2c9e8b2d0012345678",
  "pickupPointId": "664f0b2c9e8b2d0012349999",
  "seatsBooked": 2
}
```

### Verify booking payment

```http
POST /api/bookings/verify-payment
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "bookingId": "66501053ea4bb8c72f0abc11",
  "razorpay_order_id": "order_XXXXXXXXXXXXXX",
  "razorpay_payment_id": "pay_XXXXXXXXXXXXXX",
  "razorpay_signature": "generated_signature"
}
```

### AI trip autofill (organizer)

```http
POST /api/ai/trip-autofill
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "source": "Delhi",
  "destination": "Manali",
  "context": {
    "currentForm": {
      "totalSeats": 12
    }
  }
}
```

---

## Razorpay Test Mode Checklist

1. Use `rzp_test_...` key pair in backend env.
2. Restart backend after env changes.
3. Use Razorpay test cards/UPI/netbanking methods only.
4. Confirm booking status changes to `confirmed` + `paymentStatus: paid`.
5. Confirm e-ticket appears in traveler dashboard.

---

## Email Delivery Notes (SMTP)

- Booking confirmation email is sent on successful payment verification.
- If SMTP is not configured, booking still confirms and API returns `emailDelivery.skipped`.
- Gmail requires:
  - 2-step verification enabled
  - App password used in `SMTP_PASS`

---

## Troubleshooting

### Payment popup opens but fails instantly
- Ensure backend has valid Razorpay test keys.
- Verify `/api/bookings/initiate-payment` returns `orderId`, `keyId`, and `bookingId`.

### “International cards are not supported” in test flow
- Use Razorpay test methods intended for Indian flow (recommended: test netbanking).

### Booking confirmed but no email received
- Check SMTP env values.
- Verify sender account/app password.
- Check spam/promotions folder.

### CORS or socket connection issues
- Ensure `CLIENT_URL` exactly matches frontend origin (protocol + port).

### AI endpoints fail
- Check `GROQ_API_KEY` and model value.
- Inspect backend logs for API quota or model errors.

---

## API Areas (high level)

- `/api/auth` - registration, login, Google auth
- `/api/users` - user profile
- `/api/organizers` - organizer profile and approval flows
- `/api/trips` - trip CRUD and search
- `/api/bookings` - booking + payment + completion/cancel
- `/api/companions` - companion matching and requests
- `/api/group-chats`, `/api/chat` - messaging
- `/api/notifications` - notifications
- `/api/reviews` - reviews
- `/api/admin` - admin operations
- `/api/ai` - copilot + trip autofill

---

## Deployment

`render.yaml` includes:
- Web service: **bagpacker-backend**
- Cron service: **bagpacker-trip-maintenance** (every 10 minutes)

Set required environment variables in Render dashboard before deployment.

---

## Notes

- Use **Razorpay Test Mode** (`rzp_test_...`) for safe development testing.
- For Gmail SMTP, use a **Google App Password**, not normal account password.
- Ensure `CLIENT_URL` exactly matches your frontend origin for CORS and Socket.IO.

