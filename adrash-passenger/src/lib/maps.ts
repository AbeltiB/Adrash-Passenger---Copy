// Google Maps availability.
//
// react-native-maps with the Google provider hard-crashes on Android at
// MapView init when no `com.google.android.geo.API_KEY` is present in the
// native manifest ("API key not found"). We can't detect the native meta-data
// from JS, so we mirror the key into the Expo config and read it here: screens
// render the map only when a key is configured, and fall back to a non-map view
// otherwise instead of crashing.
//
// To enable real maps, set the key in app.json:
//   "android": { "config": { "googleMaps": { "apiKey": "YOUR_KEY" } } }
// (and rebuild), or provide EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in the environment.

import Constants from 'expo-constants';

type MapsExtra = {
    android?: { config?: { googleMaps?: { apiKey?: string } } };
    ios?: { config?: { googleMapsApiKey?: string } };
};

const cfg = (Constants.expoConfig ?? {}) as MapsExtra;

export const googleMapsApiKey: string | undefined =
    cfg.android?.config?.googleMaps?.apiKey ||
    cfg.ios?.config?.googleMapsApiKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    undefined;

/** True when a Google Maps API key is configured, so MapView is safe to render. */
export const hasGoogleMaps: boolean = Boolean(googleMapsApiKey);
