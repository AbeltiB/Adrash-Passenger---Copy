// Map configuration for MapLibre (no API key required).
// Set EXPO_PUBLIC_MAP_STYLE_URL in .env to override the default tile provider.

// @ts-ignore — maplibre-react-native v11 has no default export; using legacy import for API compat
import MapLibreGL from '@maplibre/maplibre-react-native';

// MAP_AVAILABLE is false until the native module is confirmed present.
// It stays false when running an old build that doesn't yet include the
// MapLibre native module — screens guard their map renders on this flag.
export let MAP_AVAILABLE = false;
try {
    MapLibreGL.setAccessToken(null);
    MAP_AVAILABLE = true;
} catch {
    // Native module not compiled in this build.
    // Run: eas build --platform android --profile development
}

export const MAP_STYLE_URL: string =
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
    'https://tiles.openfreemap.org/styles/liberty';
