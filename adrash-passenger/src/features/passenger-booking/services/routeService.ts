import type { PickupLocationDTO, RouteDTO, StopDTO } from '../dtos/bookingDtos';
import { routeRepository } from '../repositories/routeRepository';
export class RouteService {
  listRoutes(page?: number, pageSize?: number, signal?: AbortSignal) { return routeRepository.list(page, pageSize, signal); }
  async getRouteBundle(routeId: string, signal?: AbortSignal) { const [route, pickups] = await Promise.all([routeRepository.detail(routeId, signal), routeRepository.pickupLocations(routeId, signal)]); return { route, pickups, stops: this.buildStops(route, pickups) }; }
  buildStops(route: RouteDTO, pickups: PickupLocationDTO[]): StopDTO[] { const pickupStops = pickups.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, sequenceOrder: p.sequenceOrder, isPickup: true, isDropoff: false })); const stops = route.stops ?? []; return [...pickupStops, ...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder); }
  filter(routes: RouteDTO[], origin?: string, destination?: string) { return routes.filter((r) => (!origin || (r.originCity ?? '').toLowerCase().includes(origin.toLowerCase())) && (!destination || (r.destinationCity ?? '').toLowerCase().includes(destination.toLowerCase()))); }
  // Compares POSITION within the already-merged, already-sorted `stops` list
  // (the same one the route timeline renders), not the two ends' raw
  // `sequenceOrder` fields directly. pickup.sequenceOrder comes from the
  // /pickup-locations endpoint and dropoff.sequenceOrder from /routes/{id}'s
  // own stops — two independently-numbered lists with no guarantee their
  // values share one scale. Comparing them directly falsely rejected any
  // pickup past the first one on a multi-pickup route ("Dropoff must be
  // downstream of pickup" even for a pickup that's visibly upstream of the
  // terminal in the same timeline the app just rendered).
  isDownstream(pickup: PickupLocationDTO | null, dropoff: StopDTO | null, stops: StopDTO[]) {
      if (!pickup || !dropoff || !dropoff.isDropoff) return false;
      const pickupIdx  = stops.findIndex((s) => s.id === pickup.id);
      const dropoffIdx = stops.findIndex((s) => s.id === dropoff.id);
      return pickupIdx !== -1 && dropoffIdx !== -1 && dropoffIdx > pickupIdx;
  }
}
export const routeService = new RouteService();
