// src/features/auth/store/bookingStore.ts
// (also present at src/features/booking/store/bookingStore.ts — keep both in sync)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createZustandStorage } from '../../../lib/storage';
import type {
    Route,
    Seat,
    PickupLocation,
    PassengerDetail,
    FareBreakdown,
    PaymentProvider,
} from '../../../types';

const storage = createZustandStorage('booking');

interface BookingState {
    selectedRoute:    Route | null;
    selectedSeats:    Seat[];
    selectedPickup:   PickupLocation | null;
    passengers:       PassengerDetail[];
    fareBreakdown:    FareBreakdown | null;
    selectedProvider: PaymentProvider | null;
    currentBookingId: string | null;
    setRoute:        (r: Route | null) => void;
    setSeats:        (s: Seat[]) => void;
    setPickup:       (p: PickupLocation | null) => void;
    setPassengers:   (p: PassengerDetail[]) => void;
    setFareBreakdown:(f: FareBreakdown | null) => void;
    setProvider:     (p: PaymentProvider | null) => void;
    setBookingId:    (id: string | null) => void;
    resetBooking:    () => void;
}

const RESET = {
    selectedRoute:    null,
    selectedSeats:    [] as Seat[],
    selectedPickup:   null,
    passengers:       [] as PassengerDetail[],
    fareBreakdown:    null,
    selectedProvider: null,
    currentBookingId: null,
};

export const useBookingStore = create<BookingState>()(
    persist(
        (set) => ({
            ...RESET,
            setRoute:         (r) => set({ selectedRoute: r }),
            setSeats:         (s) => set({ selectedSeats: s }),
            setPickup:        (p) => set({ selectedPickup: p }),
            setPassengers:    (p) => set({ passengers: p }),
            setFareBreakdown: (f) => set({ fareBreakdown: f }),
            setProvider:      (p) => set({ selectedProvider: p }),
            setBookingId:     (id) => set({ currentBookingId: id }),
            resetBooking:     () => set(RESET),
        }),
        {
            name: 'booking-wip',
            storage: createJSONStorage(() => storage),
        },
    ),
);