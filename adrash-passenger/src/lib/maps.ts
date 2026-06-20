// Map configuration for MapLibre (no API key required — MapLibre is open-source).
import { TurboModuleRegistry } from 'react-native';

// MAP_AVAILABLE is false until the native module is confirmed present.
// In EAS production/preview builds it will be true (the plugin compiles it in).
// In Expo Go it stays false and screens fall back to a plain grey placeholder.
export let MAP_AVAILABLE = false;
try {
    // MLRNMapViewModule is the Turbo Module registered by @maplibre/maplibre-react-native
    // when the native layer is compiled in. get() returns null when absent (unlike
    // getEnforcing which throws).
    MAP_AVAILABLE = TurboModuleRegistry.get('MLRNMapViewModule') != null;
} catch {
    // Turbo Module registry not available (very old React Native / test env).
}

export const MAP_STYLE_URL: string =
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
    'https://tiles.openfreemap.org/styles/liberty';
