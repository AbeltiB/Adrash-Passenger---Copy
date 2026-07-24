// src/components/MapErrorBoundary.tsx
// MapLibre can throw at runtime (bad/unreachable style URL, a marker with
// invalid coordinates, a native-view hiccup) in ways that have nothing to do
// with whether the native module is present (see MAP_AVAILABLE in lib/maps.ts,
// which only predicts that). Any screen rendering a MapLibreGL.Map should wrap
// it here so a map failure degrades to that screen's own fallback UI instead
// of bubbling to the app-wide error boundary and taking down the whole app.

import React from 'react';
import * as Sentry from '@sentry/react-native';

interface Props {
    children: React.ReactNode;
    /** Rendered in place of the map once it has thrown. Defaults to nothing
     *  (matches the original behavior on the one screen this was extracted from). */
    fallback?: React.ReactNode;
}

interface State {
    failed: boolean;
}

export class MapErrorBoundary extends React.Component<Props, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        Sentry.captureException(error);
    }

    render() {
        if (this.state.failed) return this.props.fallback ?? null;
        return this.props.children;
    }
}
