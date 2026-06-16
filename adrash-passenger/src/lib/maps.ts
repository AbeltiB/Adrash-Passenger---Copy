// Map configuration for MapLibre (no API key required).
// Set EXPO_PUBLIC_MAP_STYLE_URL in .env to override the default tile provider.

import MapLibreGL from '@maplibre/maplibre-react-native';

// Disable Mapbox token requirement — we use OpenStreetMap-based tiles.
MapLibreGL.setAccessToken(null);

export const MAP_STYLE_URL: string =
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
    'https://tiles.openfreemap.org/styles/liberty';
