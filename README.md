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

The driver offer is sent **only while the ride is being dispatched**, with a **short timer** (default **15 seconds**). The **driver must already be logged in, approved, and online** when the customer taps **Book**. If you log out, switch users, and log in as the driver **after** booking, the offer has already timed out — you will not see the notification.

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

API base URL: `http://localhost:4000/api/v1`.

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

2. Set **`API_BASE_URL=http://127.0.0.1:4000/api/v1`** in `apps/mobile/.env` (already aligned if you use the repo default after USB setup).

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

**Google Maps (recommended — fixes black/blank tiles and improves addresses):**

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **Billing** must be enabled (Maps has a free monthly credit; you still need a billing account).
3. Enable these APIs for the project:
   - **Maps SDK for Android**
   - **Geocoding API** (street-level pickup/drop names from GPS)
   - **Places API** (search suggestions; used when the key is set)
4. **Credentials** → **Create credentials** → **API key**.
5. Restrict the key (recommended):
   - Application restriction: **Android apps**
   - Package name: `com.zygomobile`
   - SHA-1 certificate fingerprint (debug build, from repo root):

     ```bash
     keytool -list -v -keystore apps/mobile/android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```

     Copy the **SHA1** line into the key restriction.
   - API restriction: limit to the three APIs above.
6. Add to `apps/mobile/.env`:

   ```
   GOOGLE_MAPS_API_KEY=AIza...your_key_here
   ```

7. **Rebuild** the Android app (manifest reads the key at build time):

   ```bash
   cd apps/mobile
   npx react-native run-android --no-packager
   ```

Without a key, the app uses **OpenStreetMap** tiles and **Nominatim** for addresses (works offline of Google, but less accurate in India).

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

## Out of scope (MVP)

Payments, OTP, real-time captain tracking, restaurant/captain apps, admin UI.
