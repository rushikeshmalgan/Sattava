# Sattava — AI-Powered Food Scanner & Indian Nutrition Tracker

Sattava is a React Native (Expo) app that lets you photograph your food and instantly get nutrition data, log meals, track macros, and follow a personalized Indian meal plan. It combines Google Gemini Vision AI, a curated Indian food database, FatSecret food search, and real-time Firebase sync.

---

## What it does

| Feature | Details |
|---|---|
| **AI Food Scan** | Photograph any dish → Gemini Vision identifies it and estimates nutrition (calories, carbs, protein, fat). Supports 1–5 items per photo, handles Indian dish names specifically |
| **Barcode Scan** | Scan packaged food barcodes → OpenFoodFacts API returns product nutrition data |
| **Indian Diet Database** | 1000+ Indian dishes from a curated CSV (processed into `data/csvFoods.ts`) plus a hand-coded database in `data/indianFoodsDatabase.ts`. Searchable locally, no network needed |
| **FatSecret Food Search** | Full-text food search backed by the FatSecret API. OAuth tokens managed by a small Express backend proxy (see Architecture below) |
| **Meal Planning** | Goal- and diet-type-aware Indian meal plan templates (Veg / Non-Veg / Vegan, weight-loss / maintain / muscle-gain). Stored locally via AsyncStorage |
| **Nutrition Tracking** | Daily macro logs in Firebase/Firestore. Real-time calorie ring, macro bars, water tracker, step counter |
| **Analytics** | 7-day history charts, Indian Diet Score (ICMR-RDA based), AI-generated diet insights via Gemini |
| **AI Coach** | Text-based nutrition coach powered by Gemini (chat tab) |
| **Streaks & Missions** | Daily logging streaks, hydration and step missions |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Expo App (client)                  │
│                                                      │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────┐  │
│  │  Gemini     │  │  OpenFoodFacts │  │ Firebase │  │
│  │  Vision API │  │  API (barcode) │  │Firestore │  │
│  └─────────────┘  └────────────────┘  └──────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │       Express backend  (backend/server.js)     │  │
│  │  — FatSecret OAuth token management ONLY —    │  │
│  │  /health   /api/foods/search                   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**The backend is not a general REST API.** It exists solely because FatSecret uses OAuth 2.0 client credentials that must not be bundled in the app binary. The Express server fetches and caches the bearer token, then proxies the `/foods.search` call. Everything else — Gemini Vision, OpenFoodFacts, Firebase — is called directly from the client.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App framework | [Expo](https://expo.dev) ~54 + [Expo Router](https://expo.github.io/router) ~6 |
| Language | TypeScript (strict) |
| Auth | [Clerk](https://clerk.com) (`@clerk/clerk-expo`) |
| Database | Firebase Firestore v12 |
| AI / Vision | Google Gemini API (`gemini-2.0-flash`, fallback chain to `gemini-1.5-flash-8b`) |
| Food search | FatSecret API (via backend proxy) + OpenFoodFacts API (direct) |
| Indian food DB | Bundled CSV (`Indian_Food_Nutrition_Processed.csv` → `data/csvFoods.ts`) |
| Animations | `react-native-reanimated`, `expo-linear-gradient`, `expo-blur` |
| Charts | `react-native-gifted-charts` |
| Notifications | `expo-notifications` |
| Step counter | `expo-sensors` (accelerometer-based) |
| Backend | Node.js + Express (no framework beyond that) |

---

## Project Structure

```
Sattava-main/
├── app/                     # Expo Router screens
│   ├── (auth)/              # Sign-in, Sign-up
│   ├── (tabs)/              # Main tabs: home, analytics, diet, chat, profile
│   └── log/scan-food.tsx    # Camera scanner screen
├── components/              # Reusable UI components
├── services/                # All API and business logic
│   ├── geminiVisionService.ts   # Gemini AI calls (food photo analysis, tips)
│   ├── fatSecretService.ts      # FatSecret search (calls backend proxy)
│   ├── openFoodFactsService.ts  # Barcode lookup
│   ├── scanService.ts           # Orchestrates scan flow (Gemini + OFacts)
│   ├── logService.ts            # Firestore read/write for food logs
│   ├── mealSchedulerService.ts  # Meal plan logic + AsyncStorage
│   ├── notificationService.ts   # expo-notifications helpers
│   └── ...
├── data/                    # Static Indian food data (compiled from CSV)
├── constants/               # Colors, theme, Indian regions, festivals
├── context/                 # ThemeContext
├── backend/
│   ├── server.js            # Express proxy for FatSecret OAuth
│   └── package.json
├── .env.example             # Template for required environment variables
├── app.json                 # Expo app config
└── eas.json                 # EAS Build config
```

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd Sattava-main

# App dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your real keys:

```bash
cp .env.example .env
```

```env
# Clerk (authentication)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Firebase (Firestore database)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

# Google Gemini AI (food scanning, tips, coach)
EXPO_PUBLIC_GEMINI_API_KEY=...

# FatSecret (server-only — NOT bundled into the app binary)
FATSECRET_CLIENT_ID=...
FATSECRET_CLIENT_SECRET=...

# Backend proxy URL (development: auto-detected from Expo's LAN IP)
# Production: set this to your deployed backend URL
# EXPO_PUBLIC_PROXY_BASE_URL=https://your-backend.example.com
```

**Notes:**
- `EXPO_PUBLIC_*` variables are bundled into the Expo app at build time.
- `FATSECRET_CLIENT_ID` / `FATSECRET_CLIENT_SECRET` must **not** have the `EXPO_PUBLIC_` prefix — they are server-only secrets used only by the backend proxy.
- In development, the Expo app auto-detects the backend's LAN IP via `Constants.expoConfig.hostUri`. No `EXPO_PUBLIC_PROXY_BASE_URL` is needed when running on the same Wi-Fi network.

### 3. Run the backend proxy

```bash
cd backend
node server.js
# Prints your LAN IPs and public IP (for FatSecret whitelisting)
```

> **FatSecret IP restriction**: FatSecret restricts API calls by server IP. Run the backend once, note the public IP it prints, and whitelist it at [platform.fatsecret.com](https://platform.fatsecret.com) → Your App → IP Restrictions.

### 4. Run the Expo app

In a separate terminal:

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `a` for Android emulator / `i` for iOS simulator.

---

## Running Tests

```bash
npm test
```

Tests cover the service layer (`fatSecretService`, `geminiVisionService`, `mealSchedulerService`). All external dependencies (fetch, Gemini SDK, AsyncStorage) are mocked.

---

## Building for Production (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Link to your EAS account (one-time)
eas login
eas init

# Build for Android (internal distribution preview)
eas build --platform android --profile preview

# Build for production
eas build --platform all --profile production
```

**Before your first production build:**
- Set `"package"` in `app.json` → `android` to your real package name (e.g. `com.yourname.sattava`)
- Set `"bundleIdentifier"` in `app.json` → `ios` to your real bundle ID
- Add your `projectId` (from `eas init`) to `app.json` → `expo.extra.eas`
- Ensure all `EXPO_PUBLIC_*` vars are set in your EAS environment secrets

---

## Contributing

Pull requests welcome. Please run `npm run lint` and `npm test` before submitting. The project uses ESLint with `eslint-config-expo`.
