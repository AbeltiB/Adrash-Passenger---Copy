import { create } from 'zustand';
import type { BusLocation, EtaUpdate } from '../../../types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface TrackingState {
    busLocation: BusLocation | null;
    etaUpdate: EtaUpdate | null;
    isTracking: boolean;
    connectionStatus: ConnectionStatus;
    // Actions
    setBusLocation: (loc: BusLocation | null) => void;
    setEtaUpdate: (eta: EtaUpdate | null) => void;
    setTracking: (v: boolean) => void;
    setConnectionStatus: (s: ConnectionStatus) => void;
    resetTracking: () => void;
}

export const useTrackingStore = create<TrackingState>()((set) => ({
    busLocation: null,
    etaUpdate: null,
    isTracking: false,
    connectionStatus: 'disconnected',

    setBusLocation: (loc) => set({ busLocation: loc }),
    setEtaUpdate: (eta) => set({ etaUpdate: eta }),
    setTracking: (v) => set({ isTracking: v }),
    setConnectionStatus: (s) => set({ connectionStatus: s }),
    resetTracking: () => set({
        busLocation: null, etaUpdate: null,
        isTracking: false, connectionStatus: 'disconnected',
    }),
}));