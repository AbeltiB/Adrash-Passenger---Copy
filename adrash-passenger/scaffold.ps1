<#
.SYNOPSIS
    Adrash Passenger App — Full Project Scaffold (Day 1)
.DESCRIPTION
    • Installs all libraries
    • Configures tsconfig / ESLint / Prettier / Babel / app.json
    • Generates design-system constants, all Zustand stores with types,
      Axios client + interceptors, TanStack Query client, i18n (en/am/om),
      SignalR stub, all screen/hook/component stubs.
.NOTES
    Run from:  adrash-passenger\
    Requires:  Node 20+, npm 10+, PowerShell 5.1+
    Build:     Expo dev-build required (react-native-mmkv / react-native-maps)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ────────────────────────────────────────────────────────────
# Guard
# ────────────────────────────────────────────────────────────
if (-not (Test-Path 'package.json')) {
    Write-Error 'Run scaffold.ps1 from the adrash-passenger\ directory.'; exit 1
}
$ROOT = (Get-Location).Path
Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host '║   ADRASH PASSENGER — PROJECT SCAFFOLD  DAY 1 ║' -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════╝`n" -ForegroundColor Magenta

# ────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────
function Step([string]$t) { Write-Host "`n─── $t ───────────────────────────────────────" -ForegroundColor Cyan }

function NF([string]$rel, [string]$body) {                         # New-File (UTF-8 no-BOM)
    $fp  = Join-Path $ROOT ($rel -replace '/', '\')
    $dir = [IO.Path]::GetDirectoryName($fp)
    if ($dir -and -not [IO.Directory]::Exists($dir)) {
        [IO.Directory]::CreateDirectory($dir) | Out-Null
    }
    [IO.File]::WriteAllText($fp, $body, [Text.UTF8Encoding]::new($false))
    Write-Host "  $rel" -ForegroundColor DarkGray
}

function StubScreen([string]$rel, [string]$name) {
    NF $rel "import { View, Text, StyleSheet } from 'react-native';

// TODO: implement $name screen
export default function ${name}() {
  return (
    <View style={s.root}>
      <Text>${name}</Text>
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
"
}

function StubHook([string]$rel, [string]$fn) {
    NF $rel "// TODO: implement $fn
export function ${fn}(): never {
  throw new Error('$fn not yet implemented');
}
"
}

function StubComp([string]$rel, [string]$name) {
    NF $rel "import { View } from 'react-native';

// TODO: implement $name
export function ${name}() {
  return <View />;
}
"
}

# ════════════════════════════════════════════════════════════
# STEP 1 — INSTALL DEPENDENCIES
# ════════════════════════════════════════════════════════════
Step 'STEP 1  Install Dependencies'

Write-Host '  expo-managed packages…' -ForegroundColor Yellow
npx expo install `
  expo-router `
  react-native-safe-area-context `
  react-native-screens `
  react-native-gesture-handler `
  expo-linking `
  expo-constants `
  expo-status-bar `
  expo-secure-store `
  expo-localization
if ($LASTEXITCODE -ne 0) { throw 'expo install failed' }

Write-Host '  npm packages…' -ForegroundColor Yellow
npm install `
  "zustand@^4" `
  "@tanstack/react-query@^5" `
  "axios@^1" `
  "react-hook-form@^7" `
  "@hookform/resolvers@^3" `
  "zod@^3" `
  "i18next@^23" `
  "react-i18next@^14" `
  "@microsoft/signalr@^8" `
  "react-native-mmkv@^3" `
  "react-native-maps@^1"
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

Write-Host '  dev dependencies…' -ForegroundColor Yellow
npm install --save-dev `
  "eslint@^8" `
  "prettier@^3" `
  "eslint-config-expo" `
  "@typescript-eslint/eslint-plugin@^7" `
  "@typescript-eslint/parser@^7" `
  "eslint-plugin-react@^7" `
  "eslint-plugin-react-hooks@^4" `
  "babel-plugin-module-resolver@^5"
if ($LASTEXITCODE -ne 0) { throw 'dev-dep install failed' }
Write-Host '  All packages installed.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 2 — CREATE DIRECTORY SKELETON
# ════════════════════════════════════════════════════════════
Step 'STEP 2  Directory Skeleton'

$dirs = @(
    'app/(auth)',
    'app/(tabs)',
    'app/search',
    'app/route',
    'app/booking',
    'app/trip/[id]',
    'src/api',
    'src/features/auth/hooks',
    'src/features/auth/store',
    'src/features/auth/utils',
    'src/features/search/hooks',
    'src/features/booking/hooks',
    'src/features/booking/store',
    'src/features/trips/hooks',
    'src/features/tracking/hooks',
    'src/features/tracking/store',
    'src/features/rewards/hooks',
    'src/features/notifications/hooks',
    'src/components/ui',
    'src/components/forms',
    'src/components/maps',
    'src/components/booking',
    'src/components/trips',
    'src/components/rewards',
    'src/components/layout',
    'src/hooks',
    'src/lib',
    'src/constants',
    'src/types',
    'src/utils',
    'assets/locales',
    'assets/fonts',
    'assets/images',
    '__tests__'
)
foreach ($d in $dirs) {
    $fp = Join-Path $ROOT ($d -replace '/', '\')
    if (-not [IO.Directory]::Exists($fp)) {
        [IO.Directory]::CreateDirectory($fp) | Out-Null
    }
    Write-Host "  $d" -ForegroundColor DarkGray
}
Write-Host '  Directories created.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 3 — CONFIG FILES
# ════════════════════════════════════════════════════════════
Step 'STEP 3  Config Files'

# ── package.json: switch entry to expo-router ─────────────
$pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
$pkg.main = 'expo-router/entry'
$pkg | ConvertTo-Json -Depth 10 | Set-Content 'package.json' -Encoding UTF8
Write-Host '  package.json (main -> expo-router/entry)' -ForegroundColor DarkGray

# ── tsconfig.json ─────────────────────────────────────────
NF 'tsconfig.json' '{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@assets/*": ["assets/*"]
    },
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
'

# ── app.json ──────────────────────────────────────────────
NF 'app.json' '{
  "expo": {
    "name": "Adrash",
    "slug": "adrash-passenger",
    "version": "1.0.0",
    "scheme": "adrash",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.adrash.passenger"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.adrash.passenger"
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-localization",
      [
        "react-native-maps",
        { "googleMapsApiKey": "" }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
'

# ── babel.config.js ───────────────────────────────────────
NF 'babel.config.js' @"
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@assets': './assets',
          },
          extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.json'],
        },
      ],
    ],
  };
};
"@

# ── .eslintrc.js ──────────────────────────────────────────
NF '.eslintrc.js' @"
module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/'],
};
"@

# ── .prettierrc ───────────────────────────────────────────
NF '.prettierrc' '{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSpacing": true,
  "arrowParens": "always"
}
'

# ── .env.example ──────────────────────────────────────────
NF '.env.example' '# Copy to .env.local and fill in real values
EXPO_PUBLIC_API_BASE_URL=https://api.adrash.app
EXPO_PUBLIC_SIGNALR_HUB_URL=https://api.adrash.app/hubs/tracking
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
'

# ── .env.local (blank, git-ignored) ───────────────────────
if (-not (Test-Path '.env.local')) {
    NF '.env.local' '# Local overrides — NOT committed
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5000
EXPO_PUBLIC_SIGNALR_HUB_URL=http://10.0.2.2:5000/hubs/tracking
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
'
}

# Remove stale App.tsx — expo-router owns the entry point
if (Test-Path 'App.tsx') { Remove-Item 'App.tsx' -Force }
if (Test-Path 'index.ts')  { Remove-Item 'index.ts'  -Force }
Write-Host '  Config files written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 4 — TYPE DEFINITIONS
# ════════════════════════════════════════════════════════════
Step 'STEP 4  Type Definitions'

NF 'src/api/types.ts' '// ─── Standard API response envelope ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  errors: ApiError[] | null;
  meta: ApiMeta | null;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}
'

NF 'src/types/index.ts' @"
import type { ApiResponse, ApiError, ApiMeta } from '../api/types';

// Re-export envelope types
export type { ApiResponse, ApiError, ApiMeta };

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface OtpSendRequest  { phoneNumber: string }
export interface OtpVerifyRequest { phoneNumber: string; otp: string }
export interface OtpVerifyResponse {
  tokens: AuthTokens;
  user: User;
  isNewUser: boolean;
}
export interface SetupProfileRequest { firstName: string; lastName: string }

// ─── Route / Search ───────────────────────────────────────────────────────────
export interface RouteSearchParams {
  origin?: string;
  destination?: string;
  date?: string;    // ISO date
  passengers?: number;
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  arrivalTime: string;
  departureTime: string;
  order: number;
}

export interface Amenity { id: string; name: string; icon: string }

export interface Driver {
  id: string;
  name: string;
  rating: number;
  totalTrips: number;
  photoUrl?: string;
}

export interface BusInfo {
  plateNumber: string;
  model: string;
  capacity: number;
}

export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;   // minutes
  distance: number;   // km
  fare: number;       // ETB
  availableSeats: number;
  totalSeats: number;
  amenities: Amenity[];
  stops: Stop[];
  driver: Driver;
  busInfo: BusInfo;
}

// ─── Booking ──────────────────────────────────────────────────────────────────
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Seat {
  id: string;
  number: string;
  row: number;
  column: number;
  isAvailable: boolean;
  price: number; // ETB
}

export interface SeatMap {
  rows: number;
  columns: number;
  seats: Seat[];
}

export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  additionalFare: number; // ETB
}

export interface PassengerDetail {
  seatId: string;
  seatNumber: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
}

export interface FareBreakdown {
  subtotal: number;
  serviceFee: number;
  pickupFee: number;
  discount: number;
  total: number; // ETB
}

export interface CreateBookingRequest {
  routeId: string;
  seatIds: string[];
  pickupLocationId: string;
  passengers: PassengerDetail[];
}

export interface Booking {
  id: string;
  bookingReference: string;
  routeId: string;
  route: Route;
  seats: Seat[];
  passengers: PassengerDetail[];
  pickupLocation: PickupLocation;
  status: BookingStatus;
  totalFare: number;
  serviceFee: number;
  grandTotal: number;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentProvider = 'telebirr' | 'cbe_birr' | 'awash';
export type PaymentStatus   = 'pending' | 'processing' | 'success' | 'failed';

export interface InitiatePaymentRequest {
  bookingId: string;
  provider: PaymentProvider;
  amount: number; // ETB
}

export interface InitiatePaymentResponse {
  paymentId: string;
  redirectUrl?: string;
  deepLinkUrl?: string;
  expiresAt: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  bookingId: string;
}

// ─── Trips ────────────────────────────────────────────────────────────────────
export type TripTab = 'upcoming' | 'completed' | 'cancelled';

export interface Trip extends Booking {
  canCancel: boolean;
  canReview: boolean;
  hasReview: boolean;
}

export interface SubmitReviewRequest {
  bookingId: string;
  rating: number;       // 1-5
  comment?: string;
}

export interface CancellationInfo {
  canCancel: boolean;
  reason?: string;
  refundAmount: number; // ETB
  refundPolicy: string;
}

// ─── Tracking ─────────────────────────────────────────────────────────────────
export interface BusLocation {
  busId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: string;
}

export interface EtaUpdate {
  bookingId: string;
  eta: string;           // ISO datetime
  etaMinutes: number;
  nextStop: Stop | null;
}

// ─── Rewards ──────────────────────────────────────────────────────────────────
export type RewardTransactionType = 'earned' | 'redeemed' | 'expired';

export interface RewardsBalance {
  points: number;
  monetaryValue: number; // ETB
  expiringPoints: number;
  expiringDate: string | null;
}

export interface RewardTransaction {
  id: string;
  type: RewardTransactionType;
  points: number;
  description: string;
  createdAt: string;
}

export interface RedeemPointsRequest {
  points: number;
  bookingId?: string;
}

export interface ReferralInfo {
  code: string;
  totalReferrals: number;
  pointsEarned: number;
  shareUrl: string;
}
"@

Write-Host '  Types written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 5 — DESIGN SYSTEM CONSTANTS
# ════════════════════════════════════════════════════════════
Step 'STEP 5  Design System Constants'

NF 'src/constants/Colors.ts' @"
// ─── Adrash Passenger — Colour Tokens ──────────────────────────────────────

export const Colors = {
  // Brand
  brand: {
    primary:       '#1A6B3C',   // Adrash forest-green
    primaryDark:   '#0D4A2A',
    primaryLight:  '#2D9A58',
    secondary:     '#F5A623',   // Ethiopian gold
    secondaryDark: '#D4891A',
    secondaryLight:'#F7BE5E',
  },

  // Neutral scale
  neutral: {
    white:   '#FFFFFF',
    black:   '#000000',
    gray50:  '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },

  // Semantic
  semantic: {
    success:      '#16A34A',
    successLight: '#DCFCE7',
    warning:      '#D97706',
    warningLight: '#FEF3C7',
    error:        '#DC2626',
    errorLight:   '#FEE2E2',
    info:         '#2563EB',
    infoLight:    '#DBEAFE',
  },

  // Payment provider brand colours
  payment: {
    telebirr: '#6B21A8',
    cbeBirr:  '#1E40AF',
    awash:    '#92400E',
  },

  // Seat-map cell states
  seat: {
    available:       '#DCFCE7',
    availableBorder: '#16A34A',
    occupied:        '#FEE2E2',
    occupiedBorder:  '#DC2626',
    selected:        '#1A6B3C',
    selectedText:    '#FFFFFF',
  },

  // Surface / background
  background: {
    primary:   '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary:  '#F3F4F6',
  },

  // Text
  text: {
    primary:   '#111827',
    secondary: '#374151',
    tertiary:  '#6B7280',
    disabled:  '#9CA3AF',
    inverse:   '#FFFFFF',
    link:      '#1A6B3C',
  },

  // Border
  border: {
    light:  '#E5E7EB',
    medium: '#D1D5DB',
    dark:   '#9CA3AF',
  },
} as const;

export type Colors = typeof Colors;
"@

NF 'src/constants/spacing.ts' @"
// --- Spacing & Shape Tokens -------------------------------------------

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;
"@

NF 'src/constants/typography.ts' @"
// --- Typography Tokens ------------------------------------------------
// Replace FontFamily values with expo-font loaded custom fonts when ready.

export const FontFamily = {
  regular:  'System',
  medium:   'System',
  semibold: 'System',
  bold:     'System',
  // TODO: 'NotoSansEthiopic-Regular' etc. after font loading
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

const TL = { tight: 1.25, normal: 1.5, relaxed: 1.75 };

export const TextStyles = {
  h1:        { fontSize: FontSize['3xl'], fontFamily: FontFamily.bold,     lineHeight: FontSize['3xl'] * TL.tight },
  h2:        { fontSize: FontSize['2xl'], fontFamily: FontFamily.bold,     lineHeight: FontSize['2xl'] * TL.tight },
  h3:        { fontSize: FontSize.xl,    fontFamily: FontFamily.semibold,  lineHeight: FontSize.xl    * TL.tight },
  h4:        { fontSize: FontSize.lg,    fontFamily: FontFamily.semibold,  lineHeight: FontSize.lg    * TL.normal },
  bodyLarge: { fontSize: FontSize.md,    fontFamily: FontFamily.regular,   lineHeight: FontSize.md    * TL.normal },
  body:      { fontSize: FontSize.base,  fontFamily: FontFamily.regular,   lineHeight: FontSize.base  * TL.normal },
  bodySmall: { fontSize: FontSize.sm,    fontFamily: FontFamily.regular,   lineHeight: FontSize.sm    * TL.normal },
  label:     { fontSize: FontSize.sm,    fontFamily: FontFamily.medium,    lineHeight: FontSize.sm    * TL.normal },
  caption:   { fontSize: FontSize.xs,    fontFamily: FontFamily.regular,   lineHeight: FontSize.xs    * TL.normal },
} as const;
"@

NF 'src/constants/paymentProviders.ts' @"
import type { PaymentProvider } from '../types';

export interface PaymentProviderConfig {
  id: PaymentProvider;
  /** i18n key */
  labelKey: string;
  /** Hex brand colour */
  color: string;
  /** Short abbrev shown when logo is unavailable */
  abbr: string;
}

export const PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
  { id: 'telebirr', labelKey: 'booking.payment.telebirr', color: '#6B21A8', abbr: 'TB' },
  { id: 'cbe_birr', labelKey: 'booking.payment.cbe_birr', color: '#1E40AF', abbr: 'CB' },
  { id: 'awash',    labelKey: 'booking.payment.awash',    color: '#92400E', abbr: 'AW' },
] as const;
"@

NF 'src/constants/index.ts' @"
export * from './Colors';
export * from './spacing';
export * from './typography';
export * from './paymentProviders';
"@

Write-Host '  Constants written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 6 — i18n LOCALE FILES  (all keys stubbed)
# ════════════════════════════════════════════════════════════
Step 'STEP 6  i18n Locale Files'

$enJson = '{
  "common": {
    "loading": "Loading…",
    "error": "An error occurred",
    "retry": "Retry",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "done": "Done",
    "save": "Save",
    "close": "Close",
    "yes": "Yes",
    "no": "No",
    "search": "Search",
    "currency": "ETB",
    "network_error": "No internet connection.",
    "session_expired": "Session expired. Please log in again."
  },
  "auth": {
    "splash": {
      "tagline": "Your journey starts here"
    },
    "language": {
      "title": "Choose your language",
      "subtitle": "Select your preferred language to continue",
      "english": "English",
      "amharic": "\u12a0\u121b\u122d\u129b",
      "oromo": "Afaan Oromoo"
    },
    "agreement": {
      "title": "Terms & Privacy",
      "subtitle": "Please read and accept our terms before continuing",
      "terms_label": "Terms of Service",
      "privacy_label": "Privacy Policy",
      "accept_button": "I Accept",
      "decline_button": "Decline"
    },
    "phone": {
      "title": "Enter your phone number",
      "subtitle": "We will send you a verification code",
      "placeholder": "09XXXXXXXX",
      "send_otp": "Send Code",
      "invalid_phone": "Enter a valid Ethiopian phone number"
    },
    "otp": {
      "title": "Enter verification code",
      "subtitle": "We sent a 6-digit code to {{phone}}",
      "resend": "Resend Code",
      "resend_in": "Resend in {{seconds}}s",
      "verify": "Verify",
      "invalid_otp": "Invalid code. Try again.",
      "expired_otp": "Code expired. Request a new one."
    },
    "setup": {
      "title": "Complete your profile",
      "subtitle": "Tell us your name to get started",
      "first_name_placeholder": "First name",
      "last_name_placeholder": "Last name",
      "create_account": "Create Account",
      "first_name_required": "First name is required",
      "last_name_required": "Last name is required"
    }
  },
  "home": {
    "search_placeholder": "Where are you going?",
    "recent_searches": "Recent Searches",
    "popular_routes": "Popular Routes",
    "no_results": "No routes found",
    "search_results_title": "Available Routes"
  },
  "route": {
    "details_title": "Route Details",
    "stops": "Stops",
    "amenities": "Amenities",
    "driver_info": "Driver Info",
    "fare": "Fare",
    "duration": "Duration",
    "book_now": "Book Now",
    "seats_available": "{{count}} seats available",
    "no_seats": "No seats available"
  },
  "booking": {
    "pickup": {
      "title": "Select Pickup Location",
      "search_placeholder": "Search pickup point",
      "confirm_pickup": "Confirm Pickup"
    },
    "seats": {
      "title": "Select Your Seats",
      "selected": "{{count}} seat(s) selected",
      "available": "Available",
      "occupied": "Occupied",
      "selected_label": "Selected",
      "confirm_seats": "Confirm Seats"
    },
    "passengers": {
      "title": "Passenger Details",
      "seat_label": "Seat {{number}}",
      "name_placeholder": "Full name",
      "age_placeholder": "Age",
      "gender_label": "Gender",
      "male": "Male",
      "female": "Female",
      "continue": "Continue"
    },
    "summary": {
      "title": "Order Summary",
      "route": "Route",
      "date": "Date",
      "seats": "Seats",
      "subtotal": "Subtotal",
      "service_fee": "Service Fee",
      "pickup_fee": "Pickup Fee",
      "total": "Total",
      "proceed_to_payment": "Proceed to Payment"
    },
    "payment": {
      "title": "Payment",
      "select_method": "Select Payment Method",
      "telebirr": "TeleBirr",
      "cbe_birr": "CBE Birr",
      "awash": "Awash Bank",
      "pay_now": "Pay {{amount}} ETB",
      "processing": "Processing…"
    },
    "waiting": {
      "title": "Awaiting Confirmation",
      "message": "Your booking is being processed",
      "please_wait": "Please wait…"
    },
    "confirmation": {
      "title": "Booking Confirmed!",
      "booking_id": "Booking ID: {{id}}",
      "view_ticket": "View Ticket",
      "go_home": "Back to Home"
    }
  },
  "trips": {
    "title": "My Trips",
    "upcoming": "Upcoming",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "no_trips": "No trips found",
    "trip_detail_title": "Trip Details",
    "ticket_title": "Your Ticket",
    "track_bus": "Track Bus",
    "cancel_trip": "Cancel Booking",
    "write_review": "Write a Review",
    "cancel_confirm": "Cancel this booking?",
    "cancel_success": "Booking cancelled",
    "review_title": "Rate Your Experience",
    "review_placeholder": "Tell us about your experience…",
    "submit_review": "Submit Review",
    "tracking_title": "Live Tracking",
    "eta": "ETA: {{time}}",
    "bus_location": "Bus Location"
  },
  "rewards": {
    "title": "Rewards",
    "balance": "Your Balance",
    "points": "{{count}} Points",
    "history_title": "Points History",
    "referral_title": "Refer a Friend",
    "referral_code": "Your Code",
    "referral_message": "Share your code and earn points when friends take their first ride",
    "redeem": "Redeem Points",
    "redeem_confirm": "Redeem {{count}} points?",
    "no_history": "No rewards history yet",
    "earned": "Earned",
    "redeemed": "Redeemed"
  },
  "profile": {
    "title": "Profile",
    "personal_info": "Personal Information",
    "saved_locations": "Saved Locations",
    "settings": "Settings",
    "language": "Language",
    "help": "Help & Support",
    "about": "About",
    "logout": "Log Out",
    "logout_confirm": "Are you sure you want to log out?",
    "version": "Version {{version}}"
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "network": "Network error. Check your connection.",
    "unauthorized": "Please log in to continue.",
    "not_found": "Not found.",
    "server": "Server error. Try again later.",
    "validation": "Please check your input."
  }
}
'
NF 'assets/locales/en.json' $enJson

# am.json — Amharic  (placeholder = same as en; translator fills in)
$amJson = $enJson `
  -replace '"loading": "Loading…"', '"loading": "\u12ad\u1295\u12d8\u1265\u120d…"' `
  -replace '"cancel": "Cancel"',    '"cancel": "\u1230\u122d\u12d8\u129d"' `
  -replace '"confirm": "Confirm"',  '"confirm": "\u12a0\u122d\u130b\u130d\u1260\u1275"' `
  -replace '"next": "Next"',        '"next": "\u1240\u1325\u1275"'
# Fallback: write English text as stubs so app compiles without missing keys
NF 'assets/locales/am.json' $amJson

# om.json — Oromo  (placeholder = same as en)
NF 'assets/locales/om.json' $enJson

Write-Host '  Locale files written (am/om stubbed from en).' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 7 — LIBRARY CONFIGS  (i18n / Query / SignalR)
# ════════════════════════════════════════════════════════════
Step 'STEP 7  Library Configs'

NF 'src/lib/i18n.ts' @"
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../../assets/locales/en.json';
import am from '../../assets/locales/am.json';
import om from '../../assets/locales/om.json';

const SUPPORTED = ['en', 'am', 'om'] as const;
export type SupportedLanguage = typeof SUPPORTED[number];

function getDeviceLang(): SupportedLanguage {
  const code = Localization.getLocales()[0]?.languageCode ?? 'en';
  return SUPPORTED.includes(code as SupportedLanguage) ? (code as SupportedLanguage) : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      om: { translation: om },
    },
    lng: getDeviceLang(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
  });

export default i18n;
"@

NF 'src/lib/queryClient.ts' @"
import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          2  * 60 * 1_000,   // 2 min
      gcTime:             10 * 60 * 1_000,   // 10 min
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        if (error instanceof AxiosError) {
          const status = error.response?.status ?? 0;
          if (status >= 400 && status < 500) return false;
        }
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});
"@

NF 'src/lib/signalr.ts' @"
import * as signalR from '@microsoft/signalr';

const HUB_URL =
  process.env.EXPO_PUBLIC_SIGNALR_HUB_URL ?? 'https://api.adrash.app/hubs/tracking';

let _hub: signalR.HubConnection | null = null;

/** Get (or lazily build) the hub connection — call startConnection() before use. */
export function getHub(): signalR.HubConnection {
  if (!_hub) {
    _hub = buildConnection('');
  }
  return _hub;
}

function buildConnection(accessToken: string): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(__DEV__ ? signalR.LogLevel.Information : signalR.LogLevel.Error)
    .build();
}

export async function startTracking(accessToken: string): Promise<signalR.HubConnection> {
  await stopTracking(); // always start clean
  _hub = buildConnection(accessToken);
  await _hub.start();
  return _hub;
}

export async function stopTracking(): Promise<void> {
  if (_hub?.state === signalR.HubConnectionState.Connected) {
    await _hub.stop();
  }
  _hub = null;
}
"@

Write-Host '  Library configs written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 8 — API LAYER  (endpoints + Axios client)
# ════════════════════════════════════════════════════════════
Step 'STEP 8  API Layer'

NF 'src/api/endpoints.ts' @"
export const ENDPOINTS = {
  AUTH: {
    SEND_OTP:      '/auth/send-otp',
    VERIFY_OTP:    '/auth/verify-otp',
    REFRESH:       '/auth/refresh',
    LOGOUT:        '/auth/logout',
    SETUP_PROFILE: '/auth/setup-profile',
  },
  ROUTES: {
    SEARCH:           '/routes/search',
    DETAIL:           (id: string) => \`/routes/\${id}\`,
    SEAT_MAP:         (id: string) => \`/routes/\${id}/seat-map\`,
    PICKUP_LOCATIONS: (id: string) => \`/routes/\${id}/pickup-locations\`,
  },
  BOOKINGS: {
    CREATE:            '/bookings',
    LIST:              '/bookings',
    DETAIL:            (id: string) => \`/bookings/\${id}\`,
    CANCEL:            (id: string) => \`/bookings/\${id}/cancel\`,
    CANCELLATION_INFO: (id: string) => \`/bookings/\${id}/cancellation-info\`,
  },
  PAYMENTS: {
    INITIATE: '/payments/initiate',
    STATUS:   (paymentId: string) => \`/payments/\${paymentId}/status\`,
  },
  REVIEWS: {
    SUBMIT: '/reviews',
  },
  REWARDS: {
    BALANCE:  '/rewards/balance',
    HISTORY:  '/rewards/history',
    REDEEM:   '/rewards/redeem',
    REFERRAL: '/rewards/referral',
  },
  USER: {
    PROFILE:         '/user/profile',
    UPDATE_PROFILE:  '/user/profile',
    SAVED_LOCATIONS: '/user/saved-locations',
  },
} as const;
"@

NF 'src/api/client.ts' @"
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  storeTokens,
  clearTokens,
} from '../features/auth/utils/token';
import type { ApiResponse, AuthTokens } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.adrash.app';

// ── Lazy import avoids circular dep at module-init time ───────────────────────
function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../features/auth/store/authStore').useAuthStore;
}

// ── Queue for requests during token refresh ───────────────────────────────────
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshing = false;
let queue: QueueEntry[] = [];

function flushQueue(err: unknown, token: string | null) {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
  queue = [];
}

// ── Axios instance ─────────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: \`\${API_BASE}/api/v1\`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ── Request: attach access token ──────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (cfg: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) cfg.headers.Authorization = \`Bearer \${token}\`;
    return cfg;
  },
  (err) => Promise.reject(err),
);

// ── Response: 401 → refresh ───────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = \`Bearer \${token}\`;
        return apiClient(original);
      });
    }

    original._retry = true;
    refreshing = true;

    try {
      const rt = await getRefreshToken();
      if (!rt) throw new Error('no-refresh-token');

      const { data } = await axios.post<ApiResponse<AuthTokens>>(
        \`\${API_BASE}/api/v1/auth/refresh\`,
        { refreshToken: rt },
      );
      const { accessToken, refreshToken: newRt, expiresIn } = data.data;
      await storeTokens({ accessToken, refreshToken: newRt, expiresIn });
      flushQueue(null, accessToken);

      original.headers.Authorization = \`Bearer \${accessToken}\`;
      return apiClient(original);
    } catch (refreshErr) {
      flushQueue(refreshErr, null);
      await clearTokens();
      getAuthStore().getState().logout();
      return Promise.reject(refreshErr);
    } finally {
      refreshing = false;
    }
  },
);
"@

Write-Host '  API layer written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 9 — AUTH UTILS  (SecureStore token helpers)
# ════════════════════════════════════════════════════════════
Step 'STEP 9  Auth Utils & Zustand Stores'

NF 'src/features/auth/utils/token.ts' @"
import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../../../types';

const KEYS = {
  ACCESS:  'adrash_at',
  REFRESH: 'adrash_rt',
  EXPIRY:  'adrash_exp',
} as const;

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  const expiresAt = Date.now() + tokens.expiresIn * 1_000;
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS,  tokens.accessToken),
    SecureStore.setItemAsync(KEYS.REFRESH, tokens.refreshToken),
    SecureStore.setItemAsync(KEYS.EXPIRY,  String(expiresAt)),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH);
}

export async function isTokenExpired(): Promise<boolean> {
  const exp = await SecureStore.getItemAsync(KEYS.EXPIRY);
  if (!exp) return true;
  return Date.now() >= Number(exp);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS),
    SecureStore.deleteItemAsync(KEYS.REFRESH),
    SecureStore.deleteItemAsync(KEYS.EXPIRY),
  ]);
}
"@

# ── authStore ──────────────────────────────────────────────
NF 'src/features/auth/store/authStore.ts' @"
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { User } from '../../../types';
import type { SupportedLanguage } from '../../../lib/i18n';

const mmkv = new MMKV({ id: 'auth' });
const storage = {
  getItem:    (k: string) => mmkv.getString(k) ?? null,
  setItem:    (k: string, v: string) => mmkv.set(k, v),
  removeItem: (k: string) => mmkv.delete(k),
};

interface AuthState {
  // ─ State ─────────────────────────────────
  user:                 User | null;
  isAuthenticated:      boolean;
  hasAcceptedAgreement: boolean;
  agreementVersion:     string | null;  // track T&C version
  preferredLanguage:    SupportedLanguage;
  // ─ Actions ───────────────────────────────
  setUser:              (user: User | null) => void;
  setAuthenticated:     (v: boolean) => void;
  acceptAgreement:      (version: string) => void;
  setLanguage:          (lang: SupportedLanguage) => void;
  logout:               () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:                 null,
      isAuthenticated:      false,
      hasAcceptedAgreement: false,
      agreementVersion:     null,
      preferredLanguage:    'en',

      setUser:          (user)    => set({ user }),
      setAuthenticated: (v)       => set({ isAuthenticated: v }),
      acceptAgreement:  (version) => set({ hasAcceptedAgreement: true, agreementVersion: version }),
      setLanguage:      (lang)    => set({ preferredLanguage: lang }),
      logout:           ()        => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => storage),
      // Only persist non-sensitive fields — tokens stay in SecureStore
      partialize: (s) => ({
        hasAcceptedAgreement: s.hasAcceptedAgreement,
        agreementVersion:     s.agreementVersion,
        preferredLanguage:    s.preferredLanguage,
      }),
    },
  ),
);
"@

# ── bookingStore ───────────────────────────────────────────
NF 'src/features/booking/store/bookingStore.ts' @"
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type {
  Route,
  Seat,
  PickupLocation,
  PassengerDetail,
  FareBreakdown,
  PaymentProvider,
} from '../../../types';

const mmkv = new MMKV({ id: 'booking' });
const storage = {
  getItem:    (k: string) => mmkv.getString(k) ?? null,
  setItem:    (k: string, v: string) => mmkv.set(k, v),
  removeItem: (k: string) => mmkv.delete(k),
};

interface BookingState {
  // ─ In-progress booking data ───────────────
  selectedRoute:    Route | null;
  selectedSeats:    Seat[];
  selectedPickup:   PickupLocation | null;
  passengers:       PassengerDetail[];
  fareBreakdown:    FareBreakdown | null;
  selectedProvider: PaymentProvider | null;
  currentBookingId: string | null;
  // ─ Actions ───────────────────────────────
  setRoute:        (r: Route | null) => void;
  setSeats:        (s: Seat[]) => void;
  setPickup:       (p: PickupLocation | null) => void;
  setPassengers:   (p: PassengerDetail[]) => void;
  setFareBreakdown:(f: FareBreakdown | null) => void;
  setProvider:     (p: PaymentProvider | null) => void;
  setBookingId:    (id: string | null) => void;
  resetBooking:    () => void;
}

const INIT: Omit<BookingState, keyof { [K in keyof BookingState as BookingState[K] extends Function ? K : never]: never }> = {
  selectedRoute:    null,
  selectedSeats:    [],
  selectedPickup:   null,
  passengers:       [],
  fareBreakdown:    null,
  selectedProvider: null,
  currentBookingId: null,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      selectedRoute:    null,
      selectedSeats:    [],
      selectedPickup:   null,
      passengers:       [],
      fareBreakdown:    null,
      selectedProvider: null,
      currentBookingId: null,

      setRoute:         (r) => set({ selectedRoute: r }),
      setSeats:         (s) => set({ selectedSeats: s }),
      setPickup:        (p) => set({ selectedPickup: p }),
      setPassengers:    (p) => set({ passengers: p }),
      setFareBreakdown: (f) => set({ fareBreakdown: f }),
      setProvider:      (p) => set({ selectedProvider: p }),
      setBookingId:     (id)=> set({ currentBookingId: id }),
      resetBooking:     ()  => set({
        selectedRoute: null, selectedSeats: [], selectedPickup: null,
        passengers: [], fareBreakdown: null, selectedProvider: null,
        currentBookingId: null,
      }),
    }),
    {
      name: 'booking-wip',
      storage: createJSONStorage(() => storage),
    },
  ),
);
"@

# ── trackingStore ──────────────────────────────────────────
NF 'src/features/tracking/store/trackingStore.ts' @"
import { create } from 'zustand';
import type { BusLocation, EtaUpdate } from '../../../types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface TrackingState {
  busLocation:      BusLocation | null;
  etaUpdate:        EtaUpdate | null;
  isTracking:       boolean;
  connectionStatus: ConnectionStatus;
  // Actions
  setBusLocation:      (loc: BusLocation | null) => void;
  setEtaUpdate:        (eta: EtaUpdate | null) => void;
  setTracking:         (v: boolean) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  resetTracking:       () => void;
}

export const useTrackingStore = create<TrackingState>()((set) => ({
  busLocation:      null,
  etaUpdate:        null,
  isTracking:       false,
  connectionStatus: 'disconnected',

  setBusLocation:      (loc) => set({ busLocation: loc }),
  setEtaUpdate:        (eta) => set({ etaUpdate: eta }),
  setTracking:         (v)   => set({ isTracking: v }),
  setConnectionStatus: (s)   => set({ connectionStatus: s }),
  resetTracking:       ()    => set({
    busLocation: null, etaUpdate: null,
    isTracking: false, connectionStatus: 'disconnected',
  }),
}));
"@

Write-Host '  Stores written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 10 — HOOK STUBS
# ════════════════════════════════════════════════════════════
Step 'STEP 10  Hook Stubs'

# auth hooks
StubHook 'src/features/auth/hooks/useOtpSend.ts'      'useOtpSend'
StubHook 'src/features/auth/hooks/useOtpVerify.ts'    'useOtpVerify'
StubHook 'src/features/auth/hooks/useRefreshToken.ts' 'useRefreshToken'
StubHook 'src/features/auth/hooks/useLogout.ts'       'useLogout'
# search
StubHook 'src/features/search/hooks/useRouteSearch.ts'  'useRouteSearch'
StubHook 'src/features/search/hooks/useRouteDetail.ts'  'useRouteDetail'
# booking
StubHook 'src/features/booking/hooks/useCreateBooking.ts'    'useCreateBooking'
StubHook 'src/features/booking/hooks/usePickupLocations.ts'  'usePickupLocations'
StubHook 'src/features/booking/hooks/useSeatMap.ts'          'useSeatMap'
StubHook 'src/features/booking/hooks/useInitiatePayment.ts'  'useInitiatePayment'
StubHook 'src/features/booking/hooks/usePaymentStatus.ts'    'usePaymentStatus'
# trips
StubHook 'src/features/trips/hooks/useMyTrips.ts'       'useMyTrips'
StubHook 'src/features/trips/hooks/useTripDetail.ts'    'useTripDetail'
StubHook 'src/features/trips/hooks/useCancelBooking.ts' 'useCancelBooking'
StubHook 'src/features/trips/hooks/useSubmitReview.ts'  'useSubmitReview'
# tracking
StubHook 'src/features/tracking/hooks/useSignalR.ts'      'useSignalR'
StubHook 'src/features/tracking/hooks/useLiveTracking.ts' 'useLiveTracking'
StubHook 'src/features/tracking/hooks/useSos.ts'          'useSos'
# rewards
StubHook 'src/features/rewards/hooks/useRewardsBalance.ts'  'useRewardsBalance'
StubHook 'src/features/rewards/hooks/useRewardsHistory.ts'  'useRewardsHistory'
StubHook 'src/features/rewards/hooks/useRedeemPoints.ts'    'useRedeemPoints'
StubHook 'src/features/rewards/hooks/useReferralCode.ts'    'useReferralCode'
# notifications
StubHook 'src/features/notifications/hooks/useNotifications.ts'       'useNotifications'
StubHook 'src/features/notifications/hooks/useNotificationPolling.ts' 'useNotificationPolling'
# global hooks
StubHook 'src/hooks/useAppState.ts'       'useAppState'
StubHook 'src/hooks/useNetworkStatus.ts'  'useNetworkStatus'
StubHook 'src/hooks/useBiometric.ts'      'useBiometric'

Write-Host '  Hook stubs written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 11 — APP LAYOUTS  (root / auth / tabs)
# ════════════════════════════════════════════════════════════
Step 'STEP 11  App Layout Files'

NF 'app/_layout.tsx' @"
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Init i18n side-effect before any component renders
import '../src/lib/i18n';
import { queryClient } from '../src/lib/queryClient';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="route/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="booking/pickup" />
            <Stack.Screen name="booking/seats" />
            <Stack.Screen name="booking/passengers" />
            <Stack.Screen name="booking/summary" />
            <Stack.Screen name="booking/payment" />
            <Stack.Screen name="booking/waiting" />
            <Stack.Screen name="booking/confirmation" />
            <Stack.Screen name="trip/[id]" />
            <Stack.Screen name="trip/[id]/tracking" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="agreement" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
"@

NF 'app/(auth)/_layout.tsx' @"
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/features/auth/store/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="agreement" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="setup" />
    </Stack>
  );
}
"@

NF 'app/(tabs)/_layout.tsx' @"
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { Colors } from '../../src/constants';

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  if (!isAuthenticated) return <Redirect href="/(auth)/phone" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   Colors.brand.primary,
        tabBarInactiveTintColor: Colors.neutral.gray400,
        tabBarStyle: {
          backgroundColor: Colors.background.primary,
          borderTopColor:  Colors.border.light,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('home.search_placeholder', 'Home') }}
      />
      <Tabs.Screen
        name="my-trips"
        options={{ title: t('trips.title') }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: t('rewards.title') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile.title') }}
      />
    </Tabs>
  );
}
"@

Write-Host '  Layouts written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 12 — SCREEN STUBS
# ════════════════════════════════════════════════════════════
Step 'STEP 12  Screen Stubs'

# auth screens
StubScreen 'app/(auth)/index.tsx'     'SplashLanguageScreen'
StubScreen 'app/(auth)/agreement.tsx' 'AgreementScreen'
StubScreen 'app/(auth)/phone.tsx'     'PhoneScreen'
StubScreen 'app/(auth)/otp.tsx'       'OtpScreen'
StubScreen 'app/(auth)/setup.tsx'     'SetupScreen'
# tabs
StubScreen 'app/(tabs)/index.tsx'     'HomeSearchScreen'
StubScreen 'app/(tabs)/my-trips.tsx'  'MyTripsScreen'
StubScreen 'app/(tabs)/rewards.tsx'   'RewardsScreen'
StubScreen 'app/(tabs)/profile.tsx'   'ProfileScreen'
# search
StubScreen 'app/search/results.tsx'   'SearchResultsScreen'
# route
StubScreen 'app/route/[id].tsx'       'RouteDetailScreen'
# booking flow
StubScreen 'app/booking/pickup.tsx'        'PickupScreen'
StubScreen 'app/booking/seats.tsx'         'SeatsScreen'
StubScreen 'app/booking/passengers.tsx'    'PassengersScreen'
StubScreen 'app/booking/summary.tsx'       'SummaryScreen'
StubScreen 'app/booking/payment.tsx'       'PaymentScreen'
StubScreen 'app/booking/waiting.tsx'       'WaitingScreen'
StubScreen 'app/booking/confirmation.tsx'  'ConfirmationScreen'
# trip
StubScreen 'app/trip/[id].tsx'              'TripDetailScreen'
StubScreen 'app/trip/[id]/tracking.tsx'     'LiveTrackingScreen'
# standalone agreement (re-accept on version bump)
StubScreen 'app/agreement.tsx'              'AgreementReAcceptScreen'

Write-Host '  Screen stubs written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 13 — COMPONENT STUBS
# ════════════════════════════════════════════════════════════
Step 'STEP 13  Component Stubs'

# ui atoms
StubComp 'src/components/ui/Button.tsx'      'Button'
StubComp 'src/components/ui/Input.tsx'       'Input'
StubComp 'src/components/ui/Badge.tsx'       'Badge'
StubComp 'src/components/ui/Card.tsx'        'Card'
StubComp 'src/components/ui/Modal.tsx'       'Modal'
StubComp 'src/components/ui/Toast.tsx'       'Toast'
StubComp 'src/components/ui/BottomSheet.tsx' 'BottomSheet'
# forms
StubComp 'src/components/forms/FormField.tsx'           'FormField'
StubComp 'src/components/forms/PassengerDetailForm.tsx' 'PassengerDetailForm'
StubComp 'src/components/forms/PhoneInput.tsx'          'PhoneInput'
# maps
StubComp 'src/components/maps/RouteMap.tsx'     'RouteMap'
StubComp 'src/components/maps/LiveBusMarker.tsx' 'LiveBusMarker'
StubComp 'src/components/maps/PickupPin.tsx'    'PickupPin'
StubComp 'src/components/maps/DropoffPin.tsx'   'DropoffPin'
# booking
StubComp 'src/components/booking/TripCard.tsx'           'TripCard'
StubComp 'src/components/booking/SeatMap.tsx'            'SeatMap'
StubComp 'src/components/booking/SeatCell.tsx'           'SeatCell'
StubComp 'src/components/booking/PickupLocationCard.tsx' 'PickupLocationCard'
StubComp 'src/components/booking/FareBreakdown.tsx'      'FareBreakdown'
StubComp 'src/components/booking/PaymentMethodCard.tsx'  'PaymentMethodCard'
StubComp 'src/components/booking/QRTicket.tsx'           'QRTicket'
# trips
StubComp 'src/components/trips/MyTripCard.tsx'          'MyTripCard'
StubComp 'src/components/trips/TripStatusBadge.tsx'     'TripStatusBadge'
StubComp 'src/components/trips/CancellationPolicy.tsx'  'CancellationPolicy'
# rewards
StubComp 'src/components/rewards/PointsBadge.tsx'       'PointsBadge'
StubComp 'src/components/rewards/ReferralCard.tsx'      'ReferralCard'
StubComp 'src/components/rewards/RewardHistoryItem.tsx' 'RewardHistoryItem'
# layout
StubComp 'src/components/layout/ScreenWrapper.tsx' 'ScreenWrapper'
StubComp 'src/components/layout/TabBarIcon.tsx'    'TabBarIcon'
StubComp 'src/components/layout/HeaderBack.tsx'    'HeaderBack'
StubComp 'src/components/layout/SectionHeader.tsx' 'SectionHeader'

Write-Host '  Component stubs written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# STEP 14 — UTILITY FILES
# ════════════════════════════════════════════════════════════
Step 'STEP 14  Utility Files'

NF 'src/utils/currency.ts' @"
// ─── ETB currency formatter ─────────────────────────────────────────────────

const ETB = new Intl.NumberFormat('en-ET', {
  style: 'currency',
  currency: 'ETB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format amount as  'ETB 1,250.00' */
export function formatETB(amount: number): string {
  return ETB.format(amount);
}

/** Short form: 'ETB 1,250' (no decimals when whole number) */
export function formatETBShort(amount: number): string {
  return amount % 1 === 0
    ? \`ETB \${amount.toLocaleString('en-ET')}\`
    : formatETB(amount);
}
"@

NF 'src/utils/date.ts' @"
import { format, formatDistanceToNow, parseISO } from 'date-fns';
// NOTE: install date-fns when date formatting is needed:  npm install date-fns

/** 'Mon, 12 Jun 2025' */
export function formatDate(iso: string): string {
  return format(parseISO(iso), 'EEE, d MMM yyyy');
}

/** 'Mon, 12 Jun 2025 · 08:30' */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "EEE, d MMM yyyy · HH:mm");
}

/** '08:30' */
export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

/** '2 hours ago' */
export function timeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

/** Duration  75 -> '1h 15m' */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? \`\${h}h \${m}m\` : \`\${m}m\`;
}
"@

NF 'src/utils/qr.ts' @"
// ─── QR ticket helpers ───────────────────────────────────────────────────────
// TODO: integrate a QR rendering library (e.g. react-native-qrcode-svg)

/** Returns the raw data string to encode in the QR code */
export function buildQrPayload(bookingId: string, reference: string): string {
  return JSON.stringify({ bid: bookingId, ref: reference, app: 'adrash', v: 1 });
}
"@

Write-Host '  Utility files written.' -ForegroundColor Green

# ════════════════════════════════════════════════════════════
# DONE
# ════════════════════════════════════════════════════════════
Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host '║  Scaffold complete!  Next steps:                         ║' -ForegroundColor Green
Write-Host '║                                                          ║' -ForegroundColor Green
Write-Host '║  1.  Copy .env.example -> .env.local  and fill values    ║' -ForegroundColor Green
Write-Host '║  2.  Add Google Maps API key to app.json plugin block    ║' -ForegroundColor Green
Write-Host '║  3.  Run: npx expo run:android  (dev-build required)     ║' -ForegroundColor Green
Write-Host '║  4.  Translate assets/locales/am.json  &  om.json        ║' -ForegroundColor Green
Write-Host '║  5.  Install date-fns: npm install date-fns              ║' -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green