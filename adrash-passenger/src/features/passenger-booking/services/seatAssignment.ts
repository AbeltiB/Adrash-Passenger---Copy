import { tripRepository } from '../repositories/tripRepository';

// Real interactive seat selection is not offered right now — seats are assigned
// automatically, first-come-first-served, in ascending seat-number order among
// whatever GET /trips/:id/seats currently reports as free. The server still owns
// the source of truth (Redis pessimistic lock on booking create), so a race with
// another passenger is possible between this fetch and booking creation; callers
// are expected to retry once via assignSequentialSeats on a seat-conflict error.
export class NotEnoughSeatsError extends Error {
    constructor(public available: number, public needed: number) {
        super(`Only ${available} seat(s) available, ${needed} needed.`);
    }
}

export async function assignSequentialSeats(
    tripId: string,
    count: number,
    signal?: AbortSignal,
): Promise<number[]> {
    const seatMap = await tripRepository.seats(tripId, signal);
    const available = seatMap
        .filter((s) => !s.isBooked)
        .map((s) => s.seatNumber)
        .sort((a, b) => a - b);

    if (available.length < count) {
        throw new NotEnoughSeatsError(available.length, count);
    }

    return available.slice(0, count);
}
