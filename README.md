# Zygo — Food + Rides (MVP)

Monorepo: **Express + MongoDB API** (`apps/api`) and **bare React Native** customer app (`apps/mobile`) — Swiggy-style food ordering and Rapido-style rides with a single account.

## Prerequisites

- Node.js 22+ (as required by the RN template)
- MongoDB locally (`mongodb://127.0.0.1:27017/zygo`) or **MongoDB Atlas** (`mongodb+srv://…` — use database path `/zygo`; in Atlas **Network Access** allow your IP or `0.0.0.0/0` for dev)
- Android Studio + SDK for `react-native run-android` (Windows)

## Quick start — API

```bash
cd apps/api
copy .env.example .env
# Edit .env: set MONGODB_URI (Atlas or local), JWT_SECRET

npm run dev
```

For **Atlas**, paste the SRV string from the Atlas UI and ensure the path includes **`/zygo`** (and `retryWrites=true&w=majority` if not already present). If the DB password contains **`@`**, URL-encode it as **`%40`**.

In another terminal, seed sample restaurants, menu items, captains, and a test customer:

```bash
cd c:\dev\zygo
npm run seed
```

**Test logins** (password `password123` for all):

| Role | Phone |
|------|--------|
| Customer | `9999999999` |
| Shop owner | `9666666666` |
| Admin | `9555555555` |
| Delivery partner (approved, online) | `9444444444` |
| Delivery partner 2 | `9333333333` |
| Ride driver (approved, online, bike) | `9222222222` |

### Testing ride requests (customer + driver)

The driver offer is sent while the ride is dispatching (default **90 seconds** per driver; override with `RIDE_REQUEST_TIMEOUT_MS` in `apps/api/.env`). The driver must be **approved**, **Online ON** on Hub, and **Bike** must match the customer’s vehicle. If the customer books first, going **Online** on the driver phone re-offers waiting rides from the last hour.

**Recommended:** use **two devices** (or **Android emulator + physical phone**):

1. **Driver phone:** `9222222222` → Hub → turn **Online** ON and stay on the app (or keep it in foreground for a few seconds after book).
2. **Customer phone:** `9999999999` → book a ride with vehicle type **Bike** (matches the seeded driver).
3. The driver device should show the **Accept / Reject** sheet and hear polling fallback within a few seconds.

**One phone (supported):** book as customer, log out, log in as driver (`9222222222`), open **Hub**, turn **Online** ON. The API re-offers rides from the **last hour** that had no driver (dev timeout is **2 minutes** per offer unless you set `RIDE_REQUEST_TIMEOUT_MS` in `apps/api/.env`). Use vehicle type **Bike** for the seeded driver.

Still faster with two devices; one-phone flow needs you to go online **after** booking, not before.

Real-time delivery uses **Socket.IO** on the same host as the API (no `/api/v1` path). When testing on a physical device with USB, run `adb reverse tcp:4000 tcp:4000` so the app can reach the API and socket.

**Delivery partner login shows “Invalid credentials”?**

1. Create/update test accounts in the **same database** your API uses (`MONGODB_URI` in `apps/api/.env`):

   ```bash
   npm run seed:users
   ```

   (Use full `npm run seed` only if you want to reset restaurants and sample orders too.)

2. Sign in with **10 digits only** in the phone field (`9444444444`, not `+91` or `919444444444`) and password `password123`.

3. If you registered that number yourself via Sign up, use **your** password from registration—not `password123`—unless you ran `seed:users` afterward (that resets the password for test phones).

**Delivery partner not getting Accept / Reject when shop marks ready?**

1. On the rider app **Hub** tab, turn **Online** ON *before* the shop taps “Mark ready for pickup”.
2. Rider must be **admin-approved** (`npm run seed:users` pre-approves `9444444444`).
3. Keep the rider app open; requests show as a bottom sheet (Accept / Reject) and poll every few seconds if Socket.IO is blocked.
4. On USB, run `adb reverse tcp:4000 tcp:4000` so real-time events reach the phone.
5. Advance the shop order through: Accept → Start preparing → **Mark ready for pickup** (dispatch starts only on that step).

API base URL (production): `https://zygo.onrender.com/api/v1`. Local dev: `http://localhost:4000/api/v1`.

## Quick start — Mobile

```bash
cd apps/mobile
copy .env.example .env
```

Default `.env.example` covers **emulator** (`10.0.2.2`), **USB + adb reverse** (`127.0.0.1`), or **Wi‑Fi** (your PC LAN IP). See **Physical Android device (USB)** below.

**npm workspaces:** dependencies are hoisted to the repo root; [`metro.config.js`](apps/mobile/metro.config.js) points Metro at `zygo/node_modules`. After Metro/config changes, run **`npx react-native start --reset-cache`** from `apps/mobile`.

**API URL:** `apps/mobile/.env` is copied into [`src/config/generatedApiUrl.ts`](apps/mobile/src/config/generatedApiUrl.ts) by **`npm run sync-env`** (runs automatically via **`prestart`** and before **`npm run android`**). If you change `.env` while Metro is already running, run **`npm run sync-env`** in `apps/mobile` and reload the app.

## Physical Android device (USB)

After enabling **USB debugging** and plugging in the phone:

1. **Port forwarding** (run whenever you reconnect the cable):

```bash
adb reverse tcp:4000 tcp:4000
adb reverse tcp:8081 tcp:8081
```

2. For **production APK / multi-device testing**, set **`API_BASE_URL=https://zygo.onrender.com/api/v1`** in `apps/mobile/.env`, run **`npm run sync-env`**, then **`npm run build:apk`** (APK at `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`). For local USB dev, use **`http://127.0.0.1:4000/api/v1`** after `adb reverse`.

3. Start the API on your PC (`npm run dev:api` in `apps/api`).

4. Start Metro from `apps/mobile`: `npx react-native start`

5. Install / launch the app:

```bash
cd apps/mobile/android
set ANDROID_SERIAL=<your-device-id>
.\gradlew.bat installDebug
```

Or `npx react-native run-android` if nothing else is using port **8081** (Metro prompts interactively when the port is busy).

Monorepo note: Gradle uses hoisted `node_modules` at the repo root; `android/settings.gradle` and `android/app/build.gradle` are wired for that. **`android/local.properties`** must point at your SDK (Android Studio usually creates this).

**Mapbox (maps + address search):** Uses `@rnmapbox/maps` — **no Google Maps API key**. Only your Mapbox public token is required.

1. Sign up at [Mapbox](https://account.mapbox.com/) → **Access tokens**.
2. Copy your **public token** (starts with `pk.` — not the secret `sk.` token).
3. Add to `apps/mobile/.env`:

   ```
   MAPBOX_ACCESS_TOKEN=pk.eyJ...
   ```

   Use the **same token** in `apps/api/.env` for Mapbox Directions (ETA/fare on the server).

   Optional style override (default `mapbox/navigation-night-v1`):

   ```
   MAPBOX_STYLE_ID=mapbox/navigation-night-v1
   ```

   **Ride maps:** route lines (Directions API), live captain tracking (Socket.IO every 5s), demand heatmap overlay on plan/fare screens.

4. Rebuild after changing `.env`:

   ```bash
   cd apps/mobile
   npm run sync-env
   npx react-native run-android
   ```

Without a Mapbox token, geocoding falls back to **Nominatim** and map screens show a setup message.

**HTTP (local API):** Debug builds allow cleartext via `manifestPlaceholders` in `android/app/build.gradle`.


## Workspace scripts (repo root)

| Script        | Description                    |
|---------------|--------------------------------|
| `npm run dev:api`   | API with nodemon          |
| `npm run seed`      | Seed MongoDB              |
| `npm run build:api` | Typecheck + compile API   |
| `npm run test:api`  | API unit tests (geo/fare) |
| `npm run dev:mobile`| Start Metro bundler       |

## Architecture (high level)

- **Auth:** JWT (`Bearer` header), bcrypt passwords.
- **Food:** `GET /restaurants`, `GET /restaurants/:id`, `POST /orders`, order tracking polling.
- **Rides:** public `POST /rides/estimate`, `POST /rides` (auth), fare from distance + duration; captains seeded with `isCaptainAvailable: true`.
- **Mobile:** React Navigation (tabs + stacks), TanStack Query, Zustand (`auth`, `cart`, `service` preference).

## Image uploads (Cloudinary)

Profile photos, partner KYC documents, restaurant/menu photos upload from the app via **camera or gallery** and are stored on **Cloudinary** when configured.

Add to `apps/api/.env` (from [Cloudinary Console](https://cloudinary.com/console)):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Without these keys, the API falls back to local `apps/api/uploads/` (fine for dev; **not** persistent on Render).

After changing API env on Render, redeploy the API. Rebuild the mobile app after adding `react-native-image-picker` (new native module).

## Out of scope (MVP)

Payments, OTP, real-time captain tracking, restaurant/captain apps, admin UI.
