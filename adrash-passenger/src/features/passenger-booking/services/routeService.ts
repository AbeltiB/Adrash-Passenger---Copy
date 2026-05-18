import type { PickupLocationDTO, RouteDTO, StopDTO } from '../dtos/bookingDtos';
import { routeRepository } from '../repositories/routeRepository';
export class RouteService {
  listRoutes(page?: number, pageSize?: number, signal?: AbortSignal) { return routeRepository.list(page, pageSize, signal); }
  async getRouteBundle(routeId: string, signal?: AbortSignal) { const [route, pickups] = await Promise.all([routeRepository.detail(routeId, signal), routeRepository.pickupLocations(routeId, signal)]); return { route, pickups, stops: this.buildStops(route, pickups) }; }
  buildStops(route: RouteDTO, pickups: PickupLocationDTO[]): StopDTO[] { const pickupStops = pickups.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, sequenceOrder: p.sequenceOrder, isPickup: true, isDropoff: false })); const stops = route.stops ?? []; return [...pickupStops, ...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder); }
  filter(routes: RouteDTO[], origin?: string, destination?: string) { return routes.filter((r) => (!origin || r.originCity.toLowerCase().includes(origin.toLowerCase())) && (!destination || r.destinationCity.toLowerCase().includes(destination.toLowerCase()))); }
  isDownstream(pickup: PickupLocationDTO | null, dropoff: StopDTO | null) { return Boolean(pickup && dropoff && dropoff.isDropoff && dropoff.sequenceOrder > pickup.sequenceOrder); }
}
export const routeService = new RouteService();
