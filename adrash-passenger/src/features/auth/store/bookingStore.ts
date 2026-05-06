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
    getItem: (k: string) => mmkv.getString(k) ?? null,
    setItem: (k: string, v: string) => mmkv.set(k, v),
    removeItem: (k: string) => mmkv.delete(k),
};

interface BookingState {
    // ─ In-progress booking data ───────────────
    selectedRoute: Route | null;
    selectedSeats: Seat[];
    selectedPickup: PickupLocation | null;
    passengers: PassengerDetail[];
    fareBreakdown: FareBreakdown | null;
    selectedProvider: PaymentProvider | null;
    currentBookingId: string | null;
    // ─ Actions ───────────────────────────────
    setRoute: (r: Route | null) => void;
    setSeats: (s: Seat[]) => void;
    setPickup: (p: PickupLocation | null) => void;
    setPassengers: (p: PassengerDetail[]) => void;
    setFareBreakdown: (f: FareBreakdown | null) => void;
    setProvider: (p: PaymentProvider | null) => void;
    setBookingId: (id: string | null) => void;
    resetBooking: () => void;
}

const INIT: Omit<BookingState, keyof { [K in keyof BookingState as BookingState[K] extends Function ? K : never]: never }> = {
    selectedRoute: null,
    selectedSeats: [],
    selectedPickup: null,
    passengers: [],
    fareBreakdown: null,
    selectedProvider: null,
    currentBookingId: null,
};

export const useBookingStore = create<BookingState>()(
    persist(
        (set) => ({
            selectedRoute: null,
            selectedSeats: [],
            selectedPickup: null,
            passengers: [],
            fareBreakdown: null,
            selectedProvider: null,
            currentBookingId: null,

            setRoute: (r) => set({ selectedRoute: r }),
            setSeats: (s) => set({ selectedSeats: s }),
            setPickup: (p) => set({ selectedPickup: p }),
            setPassengers: (p) => set({ passengers: p }),
            setFareBreakdown: (f) => set({ fareBreakdown: f }),
            setProvider: (p) => set({ selectedProvider: p }),
            setBookingId: (id) => set({ currentBookingId: id }),
            resetBooking: () => set({
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